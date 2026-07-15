import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import AdminLoginPage from './AdminLoginPage';
import DashboardPage from './DashboardPage';
import AdminDashboardPage from './AdminDashboardPage';
import ProtectedRoute from './ProtectedRoute';
import HomePage from './HomePage';

function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogin = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  };

  const handleAdminLogin = (jwtToken) => {
    setToken(jwtToken);
    setUser({ username: 'Admin', email: 'admin@local' });
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className={darkMode ? 'dark-theme' : ''}>
      <Router>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calculator" element={
            <DashboardPage
              token={token}
              user={user}
              onLogout={handleLogout}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
        } />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} switchToSignup={() => {}} switchToAdmin={() => {}} />} />
        <Route path="/signup" element={<SignupPage onSignup={() => {}} switchToLogin={() => {}} />} />
        <Route path="/admin/login" element={<AdminLoginPage onAdminLogin={handleAdminLogin} switchToLogin={() => {}} />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute token={token}>
              <DashboardPage
                token={token}
                user={user}
                onLogout={handleLogout}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute token={token} requireAdmin>
              <AdminDashboardPage
                token={token}
                user={user}
                onLogout={handleLogout}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </div>
  );
}

export default App;
