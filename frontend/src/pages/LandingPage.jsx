import { Link } from 'react-router-dom';
import React from 'react';
import '../styles/main.css';
import '@fontsource/signika/400.css';
import '@fontsource/signika/600.css';
import '@fontsource/signika/700.css';

const LandingPage = () => {
  return (
    <div className="hero-section">
      {/* Navbar */}
      <div className="navbar">
        <div className="logo">TaskFlow</div>
        <div className="auth-buttons">
          <Link to="/login" className="login-btn">Log in</Link>
          <Link to="/signup" className="signup-btn">Sign up</Link>
        </div>
      </div>

      {/* Hero Content */}
      <div className="hero-content">
        <div className="titles">
          <h2 className="main-title">Turn Ideas Into Action</h2>
          <h2 className="main-title">
            Use <span style={{ color: '#B50D8A' }}>TaskFlow</span>'s Smart
          </h2>
          <h2 className="main-title">Task Management</h2>
        </div>

        <p className="description">
          Escape the clutter and chaos—unleash your productivity with an all-in-one
          project management tool built to streamline your workflow.
        </p>

        <div className="email-cta">
          <input type="email" placeholder="Enter your email..." />
          <button className="cta-button">Get Started</button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;