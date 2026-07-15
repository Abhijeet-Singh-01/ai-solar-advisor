# ☀️ AI Solar Advisor

**An AI-powered platform that helps homeowners estimate solar panel savings, ROI, and environmental impact based on real weather data.**

![Status](https://img.shields.io/badge/status-active-success)
![React](https://img.shields.io/badge/frontend-React-61DAFB?logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/backend-Flask-black?logo=flask)
![MySQL](https://img.shields.io/badge/database-MySQL-4479A1?logo=mysql&logoColor=white)
![Python](https://img.shields.io/badge/ML-scikit--learn-F7931E?logo=scikitlearn&logoColor=white)

---

## 📖 Overview

AI Solar Advisor is a full-stack web application that answers a simple question for any homeowner: **"Is solar worth it for me?"**

It combines real historical weather data, a trained machine learning model, and location-aware financial calculations to give users a personalized, data-backed recommendation — instead of a generic one-size-fits-all estimate.


---

## ✨ Features

### For Users
- 🔐 **Account system** — secure signup, login, and session management
- ⚡ **Solar Calculator** — enter your monthly electricity bill and location to get:
  - Recommended solar capacity (kW)
  - Number of panels required
  - Roof area required
  - Monthly, annual, and 25-year lifetime savings
  - Payback period and ROI
- 🤖 **AI-Powered Prediction** — a trained ML model estimates energy output using real historical weather and solar irradiance data
- 📊 **Interactive Dashboard** — visual charts for monthly/yearly savings and before-vs-after electricity cost comparison
- 🌱 **Environmental Impact** — CO₂ emissions reduced, tree-equivalent offset, and green energy generated
- 🕓 **Calculation History** — every calculation is saved to your account; revisit or delete past results anytime
- 📄 **PDF Reports** — download a clean, professional report of any calculation

### For Admins
- 🔑 **Secure Admin Login** — separate authentication from regular users
- 📈 **Admin Dashboard** — total users, total calculations, new registrations at a glance
- 👥 **User Management** — view, search, and remove user accounts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Recharts (data visualization), Axios |
| **Backend** | Python, Flask, Flask-CORS |
| **Database** | MySQL (via Laragon / phpMyAdmin) |
| **Machine Learning** | scikit-learn (RandomForestRegressor), pandas, numpy |
| **Authentication** | JWT (JSON Web Tokens), bcrypt password hashing |
| **PDF Generation** | ReportLab |
| **Weather Data** | Open-Meteo API (historical + real-time) |

---

## 🏗️ System Architecture

```
┌─────────────┐        ┌──────────────┐        ┌─────────────────┐
│   React     │◄──────►│    Flask     │◄──────►│      MySQL       │
│  Frontend   │  REST  │   Backend    │  SQL   │    Database      │
│             │  API   │              │        │                  │
└─────────────┘        └──────┬───────┘        └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐       ┌──────▼──────┐
              │  ML Model  │       │  Open-Meteo │
              │ (RandomFor-│       │     API     │
              │   est)     │       │             │
              └───────────┘       └─────────────┘
```

**Data flow:** User enters location + bill → backend fetches live weather data → ML model predicts energy output → financial calculations run (savings, ROI, payback) → results rendered on dashboard → optionally saved to history → optionally exported as PDF.

---

## 📂 Project Structure

```
ai-solar-advisor/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HomePage.jsx
│   │   │   ├── SolarInputForm.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── ...
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
├── backend/
│   ├── model/
│   │   ├── train_model.py
│   │   └── solar_model.pkl
│   ├── data/
│   │   └── weather_data.csv
│   ├── app.py
│   └── requirements.txt
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Python (v3.9+)
- MySQL / Laragon (or any local MySQL server)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ai-solar-advisor.git
cd ai-solar-advisor
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt --break-system-packages
python app.py
```
Backend runs on `http://localhost:5000` by default.

### 3. Database Setup
1. Start MySQL via Laragon (or your local server)
2. Open phpMyAdmin → create a database named `solar_advisor`
3. Import the schema: `Import` tab → select `backend/data/schema.sql`

### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000` by default.

### 5. Train the ML Model (optional — pre-trained model included)
```bash
cd backend/model
python train_model.py
```

---

## 📊 Model Performance

The energy prediction model was trained on 2 years of historical weather data using a Random Forest Regressor.



## 🔮 Future Scope

- 🤖 AI chatbot assistant for solar-related queries
- 💰 Solar loan / EMI calculator
- 📅 Online consultation booking
- 🔧 Installation request & maintenance reminders
- 📡 Live IoT-based energy monitoring (sensor integration)
- 📩 Email/SMS notifications for reports and reminders
- 🧠 AI-powered cost optimization suggestions

---

## 🔒 Security

- Passwords hashed using bcrypt — never stored in plain text
- JWT-based authentication with protected routes
- Parameterized SQL queries to prevent injection attacks
- Input validation and sanitization on all forms

---



## 👤 Author

**[Abhijeet Singh]**
Project — AKTU
[abhijeetsingh01122006@gmail.com] · [Your LinkedIn/GitHub]

---

## 📄 License

This project was developed for academic purposes as part of a final year engineering project.