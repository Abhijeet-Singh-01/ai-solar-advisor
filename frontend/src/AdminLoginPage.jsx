import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminLoginPage({ onAdminLogin, switchToLogin }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.username.trim()) {
      return 'Admin username is required.';
    }
    if (!formData.password) {
      return 'Password is required.';
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
      const response = await axios.post('http://127.0.0.1:5000/admin/login', {
        username: formData.username,
        password: formData.password,
      });

      if (response.data?.token) {
        onAdminLogin(response.data.token);
        navigate('/admin/dashboard');
      } else {
        setError('Admin login failed.');
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Admin login failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell admin-shell">
      <form className="auth-card admin-card" onSubmit={handleSubmit}>
        <div className="auth-heading">
          <h2>Admin access</h2>
          <p>Secure panel for authorised administrators.</p>
        </div>

        <label>
          Username
          <input type="text" name="username" value={formData.username} onChange={handleChange} />
        </label>

        <label>
          Password
          <input type="password" name="password" value={formData.password} onChange={handleChange} />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Checking access...' : 'Admin Login'}
        </button>

        {error && <p className="error-message">{error}</p>}

        <p className="auth-link-row">
          <button type="button" className="text-link" onClick={() => navigate('/login')}>
            Back to user login
          </button>
        </p>
      </form>
    </div>
  );
}

export default AdminLoginPage;
