import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SignupPage({ onSignup, switchToLogin }) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.username.trim()) {
      return 'Username is required.';
    }
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
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://127.0.0.1:5000/signup', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (response.data?.message) {
        setSuccess('Account created successfully. You can now log in.');
        onSignup?.();
        setTimeout(() => navigate('/login'), 800);
      } else {
        setError('Signup failed. Please try again.');
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Signup failed. Please try again.';
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
          <h2>Build your solar future</h2>
          <p>Create an account to track solar savings, carbon impact, and rooftop potential.</p>
          <div className="auth-features">
            <div>
              <strong>Smart recommendations</strong>
              <p>Personalized solar plans for your location.</p>
            </div>
            <div>
              <strong>Secure access</strong>
              <p>Encrypted user authentication and token-based sessions.</p>
            </div>
          </div>
        </aside>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-heading">
            <h2>Create account</h2>
            <p>Start your solar journey with a secure free account.</p>
          </div>

          <label>
            Username
            <input type="text" name="username" value={formData.username} onChange={handleChange} />
          </label>

          <label>
            Email
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </label>

          <label>
            Password
            <input type="password" name="password" value={formData.password} onChange={handleChange} />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <p className="auth-link-row">
            Already have an account?{' '}
            <button type="button" className="text-link" onClick={() => navigate('/login')}>
              Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;
