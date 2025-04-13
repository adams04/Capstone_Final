import React from 'react';
import '../styles/pages.css';

const AutomationPage = () => {
  return (
    <div className="page-container automation">
      <div className="page-content">
        <h2>Automation</h2>
        <h3>Save time with automations</h3>
        <ul>
          <li>Automate routine tasks with unlimited recipes</li>
          <li>Email reminders and approval requests</li>
        </ul>
        <button className="section-cta">Get Started</button>
      </div>
    </div>
  );
};

export default AutomationPage;