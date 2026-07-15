import os
import csv
from datetime import datetime, timedelta, timezone
from functools import wraps
from io import BytesIO

import joblib
import jwt
import requests
from flask import Flask, jsonify, request, Response
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import mysql.connector

# This file creates the Flask API for the AI Solar Advisor project.
# If you know JavaScript, think of this as the backend server that receives
# requests from the React frontend and sends back useful results.

app = Flask(__name__)
CORS(app)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")

bcrypt = Bcrypt(app)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "solar_advisor"),
    "charset": "utf8mb4",
    "autocommit": True,
    "connection_timeout": int(os.getenv("DB_CONNECTION_TIMEOUT", "5")),
}


def get_db_connection():
    # This helps us connect to MySQL when the auth routes need to read or write user data.
    return mysql.connector.connect(**DB_CONFIG)


def create_calculations_table():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS calculations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            city VARCHAR(255) NOT NULL,
            monthly_bill FLOAT NOT NULL,
            predicted_output FLOAT NOT NULL,
            monthly_savings FLOAT NOT NULL,
            payback_period FLOAT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX (user_id)
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


def get_authenticated_user_id():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    else:
        return None

    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        return payload.get("user_id")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# Load the trained machine learning model once when the server starts.
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "solar_model.pkl")
model = None

try:
    model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    model = None


def get_local_weather_fallback():
    fallback_path = os.path.join(os.path.dirname(__file__), "data", "weather_data.csv")
    totals = {
        "temperature": 0.0,
        "cloudcover": 0.0,
        "humidity": 0.0,
        "windspeed": 0.0,
        "radiation": 0.0,
    }
    row_count = 0

    with open(fallback_path, newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            row_count += 1
            totals["temperature"] += (float(row["temperature_2m_max"]) + float(row["temperature_2m_min"])) / 2
            totals["cloudcover"] += float(row["cloudcover_mean"])
            totals["humidity"] += float(row["relative_humidity_2m_mean"])
            totals["windspeed"] += float(row["windspeed_10m_max"])
            totals["radiation"] += float(row["shortwave_radiation_sum"])

    if row_count == 0:
        raise ValueError("No local weather data available for fallback.")

    return {key: round(value / row_count, 2) for key, value in totals.items()}


@app.get("/")
def home():
    # Simple health check route for the backend.
    return jsonify({"message": "AI Solar Advisor backend is running"})


@app.get("/weather")
def weather_lookup():
    # This route turns a city name into weather values that our prediction model can use.
    city = request.args.get("city", "").strip()

    if not city:
        return jsonify({"error": "Please provide a city name."}), 400

    try:
        # Step 1: use Open-Meteo geocoding to turn city -> latitude/longitude.
        geocode_url = "https://geocoding-api.open-meteo.com/v1/search"
        geocode_response = requests.get(geocode_url, params={"name": city, "count": 1}, timeout=20)
        geocode_response.raise_for_status()
        geocode_data = geocode_response.json()

        if not geocode_data.get("results"):
            return jsonify({"error": f"No results found for city: {city}. Please try another name."}), 404

        result = geocode_data["results"][0]
        lat = result["latitude"]
        lon = result["longitude"]

        # Step 2: use the coordinates to ask for current weather conditions.
        forecast_url = "https://api.open-meteo.com/v1/forecast"
        forecast_response = requests.get(
            forecast_url,
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,cloud_cover,relative_humidity_2m,wind_speed_10m,shortwave_radiation",
                "timezone": "auto",
            },
            timeout=20,
        )
        forecast_response.raise_for_status()
        forecast_data = forecast_response.json()

        current = forecast_data.get("current", {})

        return jsonify({
            "temperature": round(float(current.get("temperature_2m", 25)), 2),
            "cloudcover": round(float(current.get("cloud_cover", 20)), 2),
            "humidity": round(float(current.get("relative_humidity_2m", 60)), 2),
            "windspeed": round(float(current.get("wind_speed_10m", 10)), 2),
            "radiation": round(float(current.get("shortwave_radiation", 20)), 2),
        })
    except requests.Timeout:
        fallback = get_local_weather_fallback()
        return jsonify(fallback), 200
    except requests.RequestException as exc:
        fallback = get_local_weather_fallback()
        return jsonify(fallback), 200


def token_required(f):
    # This decorator checks for a JWT in the request header.
    # If it is missing or invalid, the route is blocked.
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Token missing. Please log in first."}), 401

        try:
            payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            request.user_payload = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token. Please log in again."}), 401

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Token missing. Please log in first."}), 401

        try:
            payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token. Please log in again."}), 401

        if not payload.get("isAdmin"):
            return jsonify({"error": "Admin access required."}), 403

        request.user_payload = payload
        return f(*args, **kwargs)

    return decorated


@app.get("/admin/stats")
@admin_required
def admin_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM calculations")
        total_calculations = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        )
        new_registrations_this_week = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({
            "total_users": total_users,
            "total_calculations": total_calculations,
            "new_registrations_this_week": new_registrations_this_week,
        })
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.get("/admin/users")
@admin_required
def admin_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username, email, created_at FROM users ORDER BY created_at DESC"
        )
        users = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({"users": users})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.delete("/admin/users/<int:user_id>")
@admin_required
def delete_admin_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        affected = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()

        if affected == 0:
            return jsonify({"error": "User not found."}), 404

        return jsonify({"message": "User deleted."})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.post("/signup")
def signup():
    # This route lets a new user create an account.
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing = cursor.fetchone()

        if existing:
            return jsonify({"error": "Email already registered."}), 409

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (username, email, hashed_password),
        )
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "User registered successfully."})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.post("/login")
def login():
    # This route checks a regular user's email and password.
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, username, email, password FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user or not bcrypt.check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid email or password."}), 401

        payload = {
            "user_id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "isAdmin": False,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        }
        token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

        return jsonify({"message": "Login successful.", "token": token, "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
        }})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.post("/admin/login")
def admin_login():
    # This route checks admin credentials against the admins table instead of the users table.
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, username, email, password_hash FROM admins WHERE username = %s", (username,))
        admin = cursor.fetchone()
        cursor.close()
        conn.close()

        if not admin or not bcrypt.check_password_hash(admin["password_hash"], password):
            return jsonify({"error": "Invalid admin credentials."}), 401

        payload = {
            "user_id": admin["id"],
            "username": admin["username"],
            "email": admin["email"],
            "isAdmin": True,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        }
        token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

        return jsonify({"message": "Admin login successful.", "token": token, "isAdmin": True})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.get("/profile")
@token_required
def profile():
    # This route is protected and only works when a valid JWT is sent in the header.
    payload = request.user_payload
    return jsonify({"message": "Authenticated", "user": payload})


@app.get("/my-calculations")
@token_required
def get_my_calculations():
    payload = request.user_payload
    user_id = payload.get("user_id")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, city, monthly_bill, predicted_output, monthly_savings, payback_period, created_at FROM calculations WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        )
        records = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({"calculations": records})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.delete("/my-calculations/<int:calculation_id>")
@token_required
def delete_my_calculation(calculation_id):
    payload = request.user_payload
    user_id = payload.get("user_id")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM calculations WHERE id = %s AND user_id = %s",
            (calculation_id, user_id),
        )
        affected = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()

        if affected == 0:
            return jsonify({"error": "Calculation not found or not owned by this user."}), 404

        return jsonify({"message": "Calculation deleted."})
    except mysql.connector.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500


@app.post("/predict")
def predict():
    # This route accepts weather values from the frontend and sends them to the model.
    data = request.get_json(silent=True) or {}

    required_fields = ["temperature", "cloudcover", "humidity", "windspeed", "radiation"]
    missing = [field for field in required_fields if field not in data]

    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if model is None:
        return jsonify({"error": "Model file not found. Please train the model first."}), 500

    # Our trained model expects 6 features, but the frontend sends 5 values.
    # For a simple demo, we reuse the temperature value for both temperature columns.
    features = [[
        data["temperature"],
        data["temperature"],
        data["radiation"],
        data["cloudcover"],
        data["humidity"],
        data["windspeed"],
    ]]

    prediction = model.predict(features)[0]

    return jsonify({
        "predicted_energy_output_kwh": round(float(prediction), 3)
    })


@app.post("/calculate-roi")
def calculate_roi():
    # This route estimates how much solar a user might need and how quickly it pays back.
    data = request.get_json(silent=True) or {}

    required_fields = ["monthlyBill", "rooftopArea", "tariffRate", "state"]
    missing = [field for field in required_fields if field not in data]

    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    monthly_bill = float(data["monthlyBill"])
    rooftop_area = float(data["rooftopArea"])
    tariff_rate = float(data["tariffRate"])
    state = str(data["state"])

    # Simple hardcoded subsidy table for 8 states.
    subsidies = {
        "Delhi": 40,
        "Maharashtra": 20,
        "Gujarat": 40,
        "Tamil Nadu": 25,
        "Karnataka": 20,
        "Uttar Pradesh": 15,
        "Rajasthan": 30,
        "Punjab": 20,
    }

    subsidy_percent = subsidies.get(state, 10)

    # Convert rooftop area from sq ft to square meters.
    rooftop_area_m2 = rooftop_area * 0.0929

    # Approximate solar output: 1 kW system produces about 4 kWh/day in this demo.
    monthly_units_kwh = monthly_bill / tariff_rate
    daily_units_kwh = monthly_units_kwh / 30
    required_capacity_kw = daily_units_kwh / 4.0

    # Limit capacity based on available roof area.
    roof_capacity_kw = rooftop_area_m2 / 10.0
    installed_capacity_kw = min(required_capacity_kw, roof_capacity_kw)
    installed_capacity_kw = max(installed_capacity_kw, 0.5)

    panel_size_kw = 0.4
    number_of_panels = int(-(-required_capacity_kw // panel_size_kw))
    roof_area_required_sq_m = required_capacity_kw * 10.0
    roof_area_required_sq_ft = roof_area_required_sq_m * 10.7639

    # Estimate monthly savings from solar generation.
    monthly_generation_kwh = installed_capacity_kw * 120
    estimated_monthly_savings = monthly_generation_kwh * tariff_rate

    # Estimate payback period using a rough system cost.
    system_cost = installed_capacity_kw * 60000
    annual_savings = estimated_monthly_savings * 12
    lifetime_savings_25_years = annual_savings * 25
    roi_percent = ((lifetime_savings_25_years - system_cost) / system_cost * 100) if system_cost > 0 else 0
    payback_years = system_cost / annual_savings if annual_savings > 0 else 0

    city = str(data.get("city", "")).strip() or "Unknown"
    predicted_output = float(data.get("predicted_output", 0))
    user_id = get_authenticated_user_id()
    if user_id:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO calculations (user_id, city, monthly_bill, predicted_output, monthly_savings, payback_period) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, city, monthly_bill, predicted_output, estimated_monthly_savings, round(payback_years, 2)),
            )
            conn.commit()
            cursor.close()
            conn.close()
        except mysql.connector.Error:
            pass

    return jsonify({
        "recommended_capacity_kw": round(required_capacity_kw, 2),
        "required_panel_capacity_kw": round(installed_capacity_kw, 2),
        "monthly_units_kwh": round(monthly_units_kwh, 2),
        "annual_savings": round(annual_savings, 2),
        "lifetime_savings_25_years": round(lifetime_savings_25_years, 2),
        "roi_percent": round(roi_percent, 2),
        "number_of_panels": number_of_panels,
        "roof_area_required_sq_ft": round(roof_area_required_sq_ft, 1),
        "estimated_monthly_savings": round(estimated_monthly_savings, 2),
        "payback_period_years": round(payback_years, 2),
        "state_subsidy_percent": subsidy_percent,
    })


@app.post("/carbon-footprint")
def carbon_footprint():
    # This route turns predicted solar output into a CO2 reduction estimate.
    data = request.get_json(silent=True) or {}

    if "energyOutputKwh" not in data:
        return jsonify({"error": "Missing field: energyOutputKwh"}), 400

    energy_output_kwh = float(data["energyOutputKwh"])
    co2_saved_kg = energy_output_kwh * 0.82
    tree_equivalent = co2_saved_kg / 21

    return jsonify({
        "co2_saved_kg": round(co2_saved_kg, 2),
        "tree_equivalent": round(tree_equivalent, 2),
    })


@app.post("/generate-report")
def generate_report():
    # This route creates a PDF file from the calculation data sent by the frontend.
    # The client sends a single JSON payload containing the user input, the ROI
    # results, and the environmental impact values.
    data = request.get_json(silent=True) or {}

    # "city" is the new field name; "location" keeps older frontend calls working.
    city = data.get("city") or data.get("location") or "N/A"
    monthly_bill = data.get("monthlyBill")
    predicted_output = data.get("predictedOutput")
    monthly_savings = data.get("monthlySavings")
    annual_savings = data.get("annualSavings")
    payback_period = data.get("paybackPeriod")
    co2_saved = data.get("co2SavedKg")
    tree_equivalent = data.get("treeEquivalent")
    rooftop_area = data.get("rooftopArea")
    state = data.get("state", "N/A")

    # Create a new in-memory PDF document that we can send back as a file.
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    # Report title at the top of the page.
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, 760, "AI Solar Advisor — Personalized Report")

    # Input summary: what the user entered into the calculator.
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, 730, "Input Summary")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, 712, f"City: {city}")
    pdf.drawString(50, 696, f"Rooftop Area: {rooftop_area if rooftop_area is not None else 'N/A'} sq ft")
    pdf.drawString(50, 680, f"Monthly Bill: ₹{monthly_bill if monthly_bill is not None else 'N/A'}")
    pdf.drawString(50, 664, f"State: {state}")

    # Results summary table header.
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, 630, "Results Summary")

    # Draw a simple table outline for the result fields.
    table_x = 50
    table_y = 620
    row_height = 20
    table_width = 500
    pdf.setLineWidth(0.5)
    pdf.rect(table_x, table_y - row_height * 7, table_width, row_height * 7, stroke=1, fill=0)

    # Column separators for the table.
    pdf.line(table_x + 300, table_y - row_height * 7, table_x + 300, table_y)
    for row_number in range(1, 7):
        row_y = table_y - row_height * row_number
        pdf.line(table_x, row_y, table_x + table_width, row_y)

    # Table rows with labels and values.
    pdf.setFont("Helvetica", 11)
    pdf.drawString(table_x + 10, table_y - 16, "Metric")
    pdf.drawString(table_x + 310, table_y - 16, "Value")

    pdf.drawString(table_x + 10, table_y - row_height - 16, "Predicted Output")
    pdf.drawString(table_x + 310, table_y - row_height - 16, f"{predicted_output if predicted_output is not None else 'N/A'} kWh/day")

    pdf.drawString(table_x + 10, table_y - row_height * 2 - 16, "Monthly Savings")
    pdf.drawString(table_x + 310, table_y - row_height * 2 - 16, f"₹{monthly_savings if monthly_savings is not None else 'N/A'}")

    pdf.drawString(table_x + 10, table_y - row_height * 3 - 16, "Annual Savings")
    pdf.drawString(table_x + 310, table_y - row_height * 3 - 16, f"INR {annual_savings if annual_savings is not None else 'N/A'}")

    pdf.drawString(table_x + 10, table_y - row_height * 4 - 16, "Payback Period")
    pdf.drawString(table_x + 310, table_y - row_height * 4 - 16, f"{payback_period if payback_period is not None else 'N/A'} years")

    pdf.drawString(table_x + 10, table_y - row_height * 5 - 16, "CO2 Saved")
    pdf.drawString(table_x + 310, table_y - row_height * 5 - 16, f"{co2_saved if co2_saved is not None else 'N/A'} kg/year")

    pdf.drawString(table_x + 10, table_y - row_height * 6 - 16, "Trees Equivalent")
    pdf.drawString(table_x + 310, table_y - row_height * 6 - 16, f"{tree_equivalent if tree_equivalent is not None else 'N/A'}")

    # Footer with the generation date so the document record is clear.
    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawString(50, 50, f"Generated on: {datetime.today().strftime('%Y-%m-%d')}")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return Response(
        buffer.getvalue(),
        mimetype="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ai_solar_advisor_report.pdf"},
    )


@app.get("/report/<user_id>")
def report_stub(user_id):
    # This is a simple placeholder route for future report work.
    return jsonify({
        "message": f"Report stub for user {user_id}",
        "status": "coming soon"
    })


if __name__ == "__main__":
    try:
        create_calculations_table()
    except mysql.connector.Error as exc:
        print(f"Warning: failed to create calculations table: {exc}")
    app.run(debug=True, host="0.0.0.0", port=5000)
