import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children, socket }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await authAPI.getNotifications(user._id);
      setNotifications(response);
      setUnreadCount(response.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off('new-notification');
    };
  }, [socket, user]);

  const markAsRead = async (notificationId) => {
    try {
      await authAPI.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.read)
          .map(n => authAPI.markNotificationRead(n._id))
      );
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await authAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => 
        notifications.find(n => n._id === notificationId)?.read ? prev : prev - 1
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);