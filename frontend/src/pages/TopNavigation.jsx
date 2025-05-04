import { useEffect, useRef, useState, useContext } from 'react';
import { FiLogOut } from 'react-icons/fi';
import Notifications from '../components/Notifications';
import { useAuth } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

const TopNavigation = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user } = useAuth();
  const socket = useContext(SocketContext);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  // Helper function to get complete image URL
  const getProfileImageUrl = () => {
    if (!user.profileImage) return null;
    // If it's already a full URL or data URL, return as-is
    if (user.profileImage.startsWith('http') || user.profileImage.startsWith('data:')) {
      return user.profileImage;
    }
    // Otherwise, prepend the base URL
    return `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}${user.profileImage}`;
  };

  return (
    <header className="top-nav">
      {/* TaskFlow logo on the left */}
      <div className="nav-brand">
        <h1>TaskFlow</h1>
      </div>

      {/* Notification and user profile on the right */}
      <div className="nav-actions">
        <Notifications socket={socket} user={user} />
        
        <div
          className={`user-profile-container ${isDropdownOpen ? 'active' : ''}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          ref={dropdownRef}
        >
          {user.profileImage ? (
            <img
              src={getProfileImageUrl()}
              alt="Profile"
              className="user-avatar"
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="user-name">{user.name}</span>
          <div className="user-dropdown">
            <button
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;