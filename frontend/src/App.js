import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import BoardPage from './pages/BoardPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import MyTasksPage from './pages/MyTasksPage';
import CalendarPage from './pages/CalendarPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './context/NotificationContext';
import { SocketContext } from './context/SocketContext';

function App() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection when app loads
    const newSocket = io(process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001', {
      autoConnect: false
    });
    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider socket={socket}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route 
                path="/board" 
                element={
                  <ProtectedRoute>
                    <BoardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/mytasks" 
                element={
                  <ProtectedRoute>
                    <MyTasksPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks/:boardId" 
                element={
                  <ProtectedRoute>
                    <TasksPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </SocketContext.Provider>
  );
}

export default App;