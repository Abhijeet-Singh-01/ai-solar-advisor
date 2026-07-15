import os
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt

# This script trains a simple machine learning model.
# If you know JavaScript, think of it like teaching a small prediction function
# using past examples so it can guess future solar output.

# ---- File paths ----
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weather_data.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "solar_model.pkl")
PLOT_PATH = os.path.join(os.path.dirname(__file__), "prediction_plot.png")

# ---- Load data ----
def load_data():
    # Read the CSV file we created in the previous step.
    df = pd.read_csv(DATA_PATH)

    # We only need the weather columns for training.
    feature_columns = [
        "temperature_2m_max",
        "temperature_2m_min",
        "shortwave_radiation_sum",
        "cloudcover_mean",
        "relative_humidity_2m_mean",
        "windspeed_10m_max",
    ]

    # Keep only rows that have all the needed values.
    df = df.dropna(subset=feature_columns)

    # Create a synthetic target column using a simple physics-inspired formula.
    # The formula is:
    # energy_output_kwh = shortwave_radiation_sum * 5 * 0.18 * 0.75 / 1000
    # This is just an approximate example, because we do not have real panel output data.
    df["energy_output_kwh"] = (
        df["shortwave_radiation_sum"] * 5 * 0.18 * 0.75 / 1000
    )

    # Add small random noise so the training data looks a little more realistic.
    np.random.seed(42)
    df["energy_output_kwh"] += np.random.normal(0, 0.05, len(df))

    return df, feature_columns


# ---- Split and train ----
def train_model(df, feature_columns):
    # Split the data into training and testing parts.
    # 80% to learn, 20% to check how well it learned.
    X = df[feature_columns]
    y = df["energy_output_kwh"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Create the machine learning model.
    model = RandomForestRegressor(n_estimators=200, random_state=42)

    # Teach the model using the training data.
    model.fit(X_train, y_train)

    # Use the test data to see how good the model is.
    predictions = model.predict(X_test)

    # Calculate evaluation scores.
    rmse = mean_squared_error(y_test, predictions) ** 0.5
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print("Model evaluation")
    print("----------------")
    print(f"RMSE: {rmse:.4f}")
    print(f"MAE:  {mae:.4f}")
    print(f"R²:   {r2:.4f}")

    # Save the trained model so the Flask API can use it later.
    joblib.dump(model, MODEL_PATH)
    print(f"Saved model to: {MODEL_PATH}")

    # Create a scatter plot of actual vs predicted values.
    plt.figure(figsize=(6, 6))
    plt.scatter(y_test, predictions, alpha=0.6)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
    plt.xlabel("Actual Energy Output (kWh)")
    plt.ylabel("Predicted Energy Output (kWh)")
    plt.title("Actual vs Predicted Solar Output")
    plt.tight_layout()
    plt.savefig(PLOT_PATH)
    plt.close()

    print(f"Saved plot to: {PLOT_PATH}")


# ---- Run the script ----
def main():
    df, feature_columns = load_data()
    train_model(df, feature_columns)


if __name__ == "__main__":
    main()
