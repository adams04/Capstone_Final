import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FiLayout, FiFolder, FiCheckSquare, FiCalendar, 
    FiMessageSquare, FiSettings
} from 'react-icons/fi';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { settingsAPI } from '../services/api';
import '../styles/settings.css';
import '../styles/sidebar.css';
import '../styles/top-navigation.css';

const SettingsPage = () => {
  const [startDate, setStartDate] = useState(null);
  const [activeNav, setActiveNav] = useState('projects');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profession: '',
    dateOfBirth: '',
    profileImage: ''
  });
  const [theme, setTheme] = useState('light');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await settingsAPI.getUserProfile();
        setUser(userData);
        setFormData({
          name: userData.name,
          email: userData.email,
          profession: userData.profession || '',
          dateOfBirth: userData.dateOfBirth || '',
          profileImage: userData.profileImage || ''
        });
        // Initialize date picker if date exists
        if (userData.dateOfBirth) {
          setStartDate(new Date(userData.dateOfBirth));
        }
        setTheme(userData.settings?.theme || 'light');
        setLoading(false);
      } catch (error) {
        setError('Failed to load user data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await settingsAPI.updateUserProfile({
        ...formData,
        settings: { theme }
      });
      
      setUser(updatedUser);
      setFormData({
        ...formData,
        name: updatedUser.name,
        profession: updatedUser.profession,
        dateOfBirth: updatedUser.dateOfBirth
      });
      // Update date picker with new date
      if (updatedUser.dateOfBirth) {
        setStartDate(new Date(updatedUser.dateOfBirth));
      }
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      setLoading(true);
      const response = await settingsAPI.uploadProfilePicture(formData);
      setUser(prev => ({ ...prev, profileImage: response.imageUrl }));
      setFormData(prev => ({ ...prev, profileImage: response.imageUrl }));
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <div className="error">Failed to load user information</div>;

  return (
    <div className="settings-container">
      <nav className="sidebar">
        <ul className="sidebar-menu">
          {[
            { icon: <FiLayout />, name: 'Dashboard', id: 'dashboard'},
            { icon: <FiFolder />, name: 'Projects', id: 'projects', path: '/projects' },
            { icon: <FiCheckSquare />, name: 'My Tasks', id: 'mytasks', path: '/mytasks' },
            { icon: <FiCalendar />, name: 'Calendar', id: 'calendar' },
            { icon: <FiMessageSquare />, name: 'Conversation', id: 'conversation'},
            { icon: <FiSettings />, name: 'Settings', id: 'settings', path: '/settings' }
          ].map((item) => (
            <li 
              key={item.id}
              className={`sidebar-item ${window.location.pathname === item.path ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(item.id);
                navigate(item.path);
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.name}
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="settings-content">
        <header className="top-nav">
          <div className="nav-brand">
            <h1>TaskFlow</h1>
          </div>
          <div className="user-display">
            <span className="user-name">{user.name}</span>
            <button 
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        <div className="profile-section">
          <div className="profile-image-container">
            {formData.profileImage ? (
              <img 
                src={formData.profileImage} 
                alt="Profile" 
                className="profile-image"
              />
            ) : (
              <div className="profile-image-placeholder">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="upload-button">
              Change Photo
              <input 
                type="file" 
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Profession</label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setFormData(prev => ({
                    ...prev,
                    dateOfBirth: date ? date.toISOString().split('T')[0] : ''
                  }));
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date of birth"
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={100}
                className="date-picker-input"
              />
            </div>

            <div className="form-group">
              <label>Theme</label>
              <div className="theme-options">
                <button
                  type="button"
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  Dark
                </button>
              </div>
            </div>

            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;