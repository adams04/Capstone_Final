import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/main.css';

const BoardPage = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [boardName, setBoardName] = useState('');

  return (
    <div className="board-background">
      <div className="board-container">
        <h1 className="board-title">Board</h1>
        <input
          type="text"
          className="board-input"
          placeholder="Enter your board name"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
        />
      </div>
    </div>
  );
};

export default BoardPage;