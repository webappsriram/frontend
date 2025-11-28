import React from 'react';
import './NewTemplatesCard.css';

const NewTemplatesCard = () => {
  return (
    <div className="templates-card">
      <div className="templates-badge">NEW</div>
      <div className="templates-content">
        <h3 className="templates-title">We have added new invoicing templates!</h3>
        <p className="templates-description">
          New templates focused on helping you improve your business
        </p>
        <button className="templates-button">Download Now</button>
      </div>
    </div>
  );
};

export default NewTemplatesCard;

