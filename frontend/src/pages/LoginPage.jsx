import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Add this import
import { authAPI } from '../services/api';
import '../styles/main.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      console.log('Form data:', formData); // Log form data for debugging
      
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Login response:', response); // Log response from API
      
      // Store the token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
  
      console.log('User and token saved in localStorage');
      
      // Force refresh to ensure ProtectedRoute catches the auth change
      window.location.href = '/board';
    } catch (error) {
      console.error('Login error:', error); // Log the error if login fails
      setError(error.response?.data?.error || 'Login failed');
    }
  };
  

  return (
    <div className="login-page">
      <div className="login-form-container">
        <h2 className="login-title">Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
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