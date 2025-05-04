import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLayout, FiFolder, FiCheckSquare, FiCalendar,
  FiMessageSquare, FiSettings
} from 'react-icons/fi';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { authAPI, taskAPI } from '../services/api';
import '../styles/sidebar.css';
import '../styles/top-navigation.css';
import '../styles/calendar.css';
import TopNavigation from './TopNavigation';

const CalendarPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeNav, setActiveNav] = useState('calendar');
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      try {
        const [userData, eventsData] = await Promise.all([
          authAPI.getUserProfile(),
          taskAPI.getCalendarEvents()
        ]);

        setUser(userData);
        setEvents(eventsData);
      } catch (error) {
        setError('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const dayEvents = events.filter(event => {
      if (!event.deadline) return false;
      const eventDate = new Date(event.deadline);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    return dayEvents.length > 0 ? (
      <div className="event-dots">
        {dayEvents.map((_, index) => (
          <div key={index} className="event-dot" />
        ))}
      </div>
    ) : null;
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const hasEvents = events.some(event => {
      if (!event.deadline) return false;
      const eventDate = new Date(event.deadline);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    return hasEvents ? 'has-events' : null;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      if (!event.deadline) return false;
      const eventDate = new Date(event.deadline);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <div className="error">Failed to load user information</div>;

  return (
    <div className="app-container">
      <nav className="sidebar">
        <ul className="sidebar-menu">
          {[
            { icon: <FiLayout />, name: 'Dashboard', id: 'dashboard', path: '/' },
            { icon: <FiFolder />, name: 'Projects', id: 'projects', path: '/board' },
            { icon: <FiCheckSquare />, name: 'My Tasks', id: 'mytasks', path: '/mytasks' },
            { icon: <FiCalendar />, name: 'Calendar', id: 'calendar', path: '/calendar' },
            { icon: <FiMessageSquare />, name: 'Conversation', id: 'conversation', path: '/conversation' },
            { icon: <FiSettings />, name: 'Settings', id: 'settings', path: '/settings' }
          ].map((item) => (
            <li
              key={item.id}
              className={`sidebar-item ${window.location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.name}
            </li>
          ))}
        </ul>
      </nav>

      <div className="content-area">
        <TopNavigation/>
        <div className="calendar-container">
          <h2 className="calendar-title">My Calendar</h2>
          
          {error && <div className="error-message">{error}</div>}

          <div className="calendar-wrapper">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="custom-calendar"
            />

            <div className="events-panel">
              <h3>Tasks for {selectedDate.toLocaleDateString()}</h3>
              <div className="events-list">
                {getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event, index) => (
                    <div key={index} className="event-item">
                      <div className="event-title">{event.ticketName}</div>
                      <div className="event-board">Board: {event.boardName}</div>
                      <div className="event-deadline">
                        Due: {new Date(event.deadline).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-events">No tasks due on this day</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;