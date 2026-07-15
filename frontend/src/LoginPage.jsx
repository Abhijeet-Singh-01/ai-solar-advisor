import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginPage({ onLogin, switchToSignup, switchToAdmin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.email.trim()) {
      return 'Email is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address.';
    }
    if (!formData.password) {
      return 'Password is required.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:5000/login', {
        email: formData.email,
        password: formData.password,
      });

      if (response.data?.token) {
        onLogin(response.data.token, response.data.user);
        navigate('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card auth-grid">
        <aside className="auth-side">
          <span className="auth-side-badge">AI Solar Advisor</span>
          <h2>Welcome back</h2>
          <p>Sign in to access your solar forecasts, savings insights, and energy optimization tools.</p>
          <div className="auth-features">
            <div>
              <strong>Fast insights</strong>
              <p>Instant rooftop solar potential and savings projections.</p>
            </div>
            <div>
              <strong>Personalized</strong>
              <p>Tailored recommendations based on your location and usage.</p>
            </div>
          </div>
        </aside>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-heading">
            <h2>Sign in</h2>
            <p>Enter your email and password to continue.</p>
          </div>

          <label>
            Email
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </label>

          <label>
            Password
            <input type="password" name="password" value={formData.password} onChange={handleChange} />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          {error && <p className="error-message">{error}</p>}

          <p className="auth-link-row">
            Don’t have an account?{' '}
            <button type="button" className="text-link" onClick={() => navigate('/signup')}>
              Sign up
            </button>
          </p>

          <p className="auth-link-row">
            <button type="button" className="text-link admin-link" onClick={() => navigate('/admin/login')}>
              Admin login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
