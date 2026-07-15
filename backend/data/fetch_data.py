import os
import pandas as pd
import requests
from datetime import datetime, timedelta

# This script fetches historical weather data from Open-Meteo.
# If you know JavaScript, think of this as a small function that sends a request
# to an online API and stores the answer in a CSV file.

# ---- Configuration ----
# We will use New Delhi for now. You can change these numbers later.
CITY = "New Delhi"
LAT = 28.6139
LON = 77.2090

# We want data from the last 2 years up to the latest date the API allows.
# Open-Meteo sometimes stops one day before today, so we use yesterday.
END_DATE = (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d")
START_DATE = (datetime.today() - timedelta(days=730)).strftime("%Y-%m-%d")

# Open-Meteo archive API URL.
URL = "https://archive-api.open-meteo.com/v1/archive"

# ---- Helper function to call the API ----
def fetch_weather_data(lat, lon, start_date, end_date):
    """Fetch daily weather data from Open-Meteo for a location and date range."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,shortwave_radiation_sum,cloudcover_mean,relative_humidity_2m_mean,windspeed_10m_max",
        "timezone": "auto",
    }

    # requests.get() is like fetch() in JavaScript.
    response = requests.get(URL, params=params, timeout=60)
    response.raise_for_status()  # Stop if the request fails.
    return response.json()


# ---- Main logic ----
def main():
    print(f"Fetching weather data for {CITY}...")

    # Get the API response.
    data = fetch_weather_data(LAT, LON, START_DATE, END_DATE)

    # The API returns data in a nested structure, so we extract the daily values.
    daily = data.get("daily", {})

    if not daily:
        raise ValueError("No daily data was returned by the API.")

    # Convert the daily values into a DataFrame (like a table). 
    df = pd.DataFrame(daily)

    # Rename columns to friendlier names for our project.
    df = df.rename(columns={
        "temperature_2m_max": "temperature_2m_max",
        "temperature_2m_min": "temperature_2m_min",
        "shortwave_radiation_sum": "shortwave_radiation_sum",
        "cloudcover_mean": "cloudcover_mean",
        "relative_humidity_2m_mean": "relative_humidity_2m_mean",
        "windspeed_10m_max": "windspeed_10m_max",
    })

    # Make sure the date column is a proper date type.
    df["date"] = pd.to_datetime(df["time"])
    df = df.drop(columns=["time"])

    # Save the cleaned data to a CSV file.
    output_path = os.path.join(os.path.dirname(__file__), "weather_data.csv")
    df.to_csv(output_path, index=False)

    print(f"Saved CSV file to: {output_path}")
    print("\nFirst 5 rows:")
    print(df.head().to_string(index=False))

    print("\nBasic statistics:")
    print(df.describe().to_string())


if __name__ == "__main__":
    main()
