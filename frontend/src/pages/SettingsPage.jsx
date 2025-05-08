import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLayout, FiFolder, FiCheckSquare, FiCalendar,
  FiMessageSquare, FiSettings, FiEye, FiEyeOff, FiX
} from 'react-icons/fi';
import DatePicker from "react-datepicker";
import TopNavigation from './TopNavigation';
import { useTheme } from '../context/ThemeContext';
import { settingsAPI } from '../services/api';
import '../styles/settings.css';
import '../styles/sidebar.css';
import '../styles/top-navigation.css';
import "react-datepicker/dist/react-datepicker.css";

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const professions = [
    { value: 'developer', label: 'Developer' },
    { value: 'designer', label: 'Designer' },
    { value: 'project-manager', label: 'Project Manager' },
    { value: 'qa-engineer', label: 'QA Engineer' },
    { value: 'devops', label: 'DevOps' }
  ];

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
        if (userData.dateOfBirth) {
          setStartDate(new Date(userData.dateOfBirth));
        }
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
    toggleTheme(selectedTheme);
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await settingsAPI.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setError('');
      setShowPasswordModal(false);
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const resetPasswordForm = () => {
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setShowPasswordModal(false);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <div className="error">Failed to load user information</div>;

  return (
    <div className="settings-container">
      <nav className="sidebar">
        <ul className="sidebar-menu">
          {[
            { icon: <FiLayout />, name: 'Dashboard', id: 'dashboard' },
            { icon: <FiFolder />, name: 'Projects', id: 'projects', path: '/board' },
            { icon: <FiCheckSquare />, name: 'My Tasks', id: 'mytasks', path: '/mytasks' },
            { icon: <FiCalendar />, name: 'Calendar', id: 'calendar', path: '/calendar' },
            { icon: <FiMessageSquare />, name: 'Conversation', id: 'conversation' },
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
        <TopNavigation />
        {error && !showPasswordModal && <div className="error-message">{error}</div>}

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
              <select
                name="profession"
                value={formData.profession}
                onChange={handleInputChange}
                className="profession-select"
              >
                {professions.map((profession) => (
                  <option key={profession.value} value={profession.value}>
                    {profession.label}
                  </option>
                ))}
              </select>
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
              <button
                type="button"
                className="change-password-button"
                onClick={() => setShowPasswordModal(true)}
              >
                Change Password
              </button>
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

      

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="password-modal">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button 
                className="close-modal-btn"
                onClick={resetPasswordForm}
              >
                <FiX />
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group">
                <label>Current Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword.oldPassword ? "text" : "password"}
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value
                    })}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('oldPassword')}
                  >
                    {showPassword.oldPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value
                    })}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('newPassword')}
                  >
                    {showPassword.newPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword.confirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value
                    })}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                  >
                    {showPassword.confirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={resetPasswordForm}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;