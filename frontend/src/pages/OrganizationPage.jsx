import React from 'react';
import '../styles/pages.css';

const OrganizationPage = () => {
  return (
    <div className="page-container organization">
      <div className="page-content">
        <h2>Organization</h2>
        <h3>Plan, execute, and track projects of any size</h3>
        <ul>
          <li>Easily assign tasks and prioritize what's important</li>
          <li>Track team progress and set project timelines</li>
        </ul>
        <button className="section-cta">Get Started</button>
      </div>
    </div>
  );
};

export default OrganizationPage;