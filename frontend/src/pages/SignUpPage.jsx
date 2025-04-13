import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/main.css';
import { authAPI } from '../services/api';

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: ''
  });

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
      // Transform data to match backend expectations
      const registrationData = {
        name: formData.name,
        surname: formData.surname || 'Not provided', // Default value
        email: formData.email,
        passwordHash: formData.password // Frontend uses 'password' field
      };
      
      const { token } = await authAPI.register(registrationData);
    } catch (error) {
      console.error('[FRONTEND] Full error:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
    }
  };

  return (
    <div className="login-page"> {/* Same container as login for consistency */}
      <div className="login-form-container"> {/* Reusing login styles */}
        <h2 className="login-title">Sign Up</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="login-input"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              name="email"
              className="login-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              name="password"
              className="login-input"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>
          <button type="submit" className="login-submit-btn">
            Create Account
          </button>
        </form>
        <p className="signup-link">
          Already have an account? <Link to="/login" className="signup-link-text">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export { SignUpPage };