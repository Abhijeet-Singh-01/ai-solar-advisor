import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SolarInputForm from './SolarInputForm';
import Dashboard from './Dashboard';
import CalculationHistory from './CalculationHistory';

function DashboardPage({ token, user, onLogout, darkMode, toggleDarkMode }) {
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const fetchHistory = async () => {
    if (!token) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await axios.get('http://127.0.0.1:5000/my-calculations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setHistory(response.data.calculations || []);
    } catch (err) {
      const message = err?.response?.data?.error || 'Could not load your calculation history.';
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleDeleteCalculation = async (calculationId) => {
    if (!token) return;

    try {
      await axios.delete(`http://127.0.0.1:5000/my-calculations/${calculationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchHistory();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="app-container">
      <div className="topbar">
        <div>
          <div className="topbar-label">Dashboard</div>
          <h1>AI Solar Advisor</h1>
          <p>Enter your location and energy details to get a premium solar assessment.</p>
        </div>
        <div className="topbar-controls">
          <button type="button" className="theme-toggle-btn" onClick={toggleDarkMode}>
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="user-pill">
            <span>{user?.username || 'Guest'}</span>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-hero">
        <div className="hero-content">
          <span className="hero-badge">Solar Pulse</span>
          <h2>Intelligent rooftop solar guidance</h2>
          <p>Realtime savings and emissions insight tailored to your home and location.</p>
        </div>

        <div className="hero-metrics">
          <div className="hero-metric">
            <span>Energy forecast</span>
            <strong>{results ? `${Number(results.prediction.predicted_energy_output_kwh).toFixed(1)} kWh/day` : '--'}</strong>
          </div>
          <div className="hero-metric">
            <span>Monthly savings</span>
            <strong>{results ? `₹${Number(results.roi.estimated_monthly_savings).toFixed(0)}` : '--'}</strong>
          </div>
          <div className="hero-metric">
            <span>CO₂ reduction</span>
            <strong>{results ? `${Number(results.carbon.co2_saved_kg).toFixed(0)} kg/yr` : '--'}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <SolarInputForm token={token} onResults={setResults} onHistoryRefresh={fetchHistory} />
        <Dashboard results={results} />
      </div>

      <CalculationHistory
        history={history}
        loading={historyLoading}
        error={historyError}
        onDelete={handleDeleteCalculation}
      />
    </div>
  );
}

export default DashboardPage;
