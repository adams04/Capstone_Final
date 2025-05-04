import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';
import '../styles/notifications.css';

const Notifications = ({ socket, user }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const response = await authAPI.getNotifications(user._id);
        if (response && response) {
          setNotifications(response);
          setUnreadCount(response.filter(n => !n.read).length);
        } else {
          console.error('No data found in response');
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
  
    fetchNotifications();
  }, [user._id]);  // Add user._id as a dependency if it can change during the component's lifecycle
  

  useEffect(() => {
    if (!socket) return;

    // Listen for new notifications
    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off('new-notification');
    };
  }, [socket]);

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
    <div className="notifications-container">
      <button 
        className="notifications-button"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <FiBell />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {showNotifications && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <div className="notifications-actions">
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <FiCheck /> Mark all as read
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <small className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="mark-read"
                        onClick={() => markAsRead(notification._id)}
                      >
                        <FiCheck />
                      </button>
                    )}
                    <button 
                      className="delete-notification"
                      onClick={() => deleteNotification(notification._id)}
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;