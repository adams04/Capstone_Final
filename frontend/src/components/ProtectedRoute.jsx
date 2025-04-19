import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Debugging - check what's in localStorage
  console.log('ProtectedRoute check:', {
    localStorageToken: localStorage.getItem('token'),
    contextUser: user
  });

  if (!localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;