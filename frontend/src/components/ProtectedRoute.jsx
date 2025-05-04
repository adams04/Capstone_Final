import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const ProtectedRoute = ({ children, socket }) => {
  const { user } = useContext(AuthContext);
  const { fetchNotifications } = useNotifications();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token && socket && !socket.connected) {
      // Authenticate socket if we have a token
      socket.auth = { token };
      socket.connect();
    }

    if (user) {
      // Fetch notifications when user is authenticated
      fetchNotifications();
    }

    return () => {
      // Cleanup socket listeners when component unmounts
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [user, socket, fetchNotifications]);

  if (!localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;