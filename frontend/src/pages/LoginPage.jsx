import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/main.css';
import { authAPI } from '../services/api';

const LoginPage = () => {
  // State management using single formData object
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Unified change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { token, user } = await authAPI.login(formData);
      console.log('Login successful!', user.email);
      // Store token and redirect (you'll implement this later)
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-form-container">
        <h2 className="login-title">Login</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"  // Changed from text to email for better validation
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="login-input"
              placeholder="Email"
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="login-input"
              placeholder="Password"
              required
              minLength="6"
            />
          </div>
          <button type="submit" className="login-submit-btn">
            Login
          </button>
        </form>
        <p className="signup-link">
          Don't have an account?{' '}
          <Link to="/signup" className="signup-link-text">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;