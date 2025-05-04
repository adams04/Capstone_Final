import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiLayout, FiFolder, FiCheckSquare, FiCalendar,
    FiMessageSquare, FiSettings, FiTrash2, FiEdit2
} from 'react-icons/fi';
import { authAPI, taskAPI } from '../services/api';
import TopNavigation from './TopNavigation';
import '../styles/sidebar.css';
import '../styles/top-navigation.css';
import '../styles/tasks.css';

const MyTasksPage = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeNav, setActiveNav] = useState('mytasks');

    // UI state for drag and drop
    const [draggingTask, setDraggingTask] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [draggedOverColumn, setDraggedOverColumn] = useState(null);

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
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

    // Form state
    const [editTask, setEditTask] = useState({
        title: '',
        description: '',
        deadline: '',
        priority: 'low',
        status: 'To Do'
    });

    // Fetch user data and tasks
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            try {
                const [userData, tasksData] = await Promise.all([
                    authAPI.getUserProfile(),
                    taskAPI.getMyTickets()
                ]);

                setUser(userData);
                setTasks(tasksData);
            } catch (error) {
                setError('Failed to load data');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    // Update task status when dragged and dropped
    const updateTaskStatus = async (taskId, newStatus) => {
        setIsUpdatingStatus(true);
        try {
            await taskAPI.updateTicket(taskId, {
                status: newStatus === 'Completed' ? 'Done' : newStatus
            });
            // Refresh tasks after update
            const updatedTasks = await taskAPI.getMyTickets();
            setTasks(updatedTasks);
        } catch (err) {
            setError('Failed to update task status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Handle drag start
    const handleDragStart = (e, task) => {
        setDraggingTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task._id);
    };

    // Handle drag over
    const handleDragOver = (e, columnId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDraggedOverColumn(columnId);
    };

    // Handle drag end
    const handleDragEnd = () => {
        setDraggedOverColumn(null);
        setDraggingTask(null);
    };

    // Handle drop
    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        if (!draggingTask || draggingTask.status === newStatus) {
            setDraggedOverColumn(null);
            return;
        }

        await updateTaskStatus(draggingTask._id, newStatus);
        setDraggedOverColumn(null);
        setDraggingTask(null);
    };

    // Handle task update
    const updateTask = async () => {
        if (!editTask.title.trim() || !selectedTask) return;

        setLoading(true);
        try {
            await taskAPI.updateTicket(selectedTask._id, {
                title: editTask.title.trim(),
                description: editTask.description.trim(),
                priority: editTask.priority.charAt(0).toUpperCase() + editTask.priority.slice(1),
                deadline: editTask.deadline ? new Date(editTask.deadline).toISOString() : null,
                status: editTask.status
            });

            // Refresh tasks after update
            const updatedTasks = await taskAPI.getMyTickets();
            setTasks(updatedTasks);

            setShowEditModal(false);
            setSelectedTask(null);
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update task');
        } finally {
            setLoading(false);
        }
    };

    // Handle task deletion
    const deleteTask = async () => {
        if (!selectedTask) return;

        setLoading(true);
        try {
            await taskAPI.deleteTicket(selectedTask._id);

            // Refresh tasks after deletion
            const updatedTasks = await taskAPI.getMyTickets();
            setTasks(updatedTasks);

            setShowDeleteModal(false);
            setSelectedTask(null);
        } catch (error) {
            setError('Failed to delete task');
        } finally {
            setLoading(false);
        }
    };

    // Group tasks by status
    const groupedTasks = tasks.reduce((acc, task) => {
        const status = task.status || 'To Do';
        if (!acc[status]) acc[status] = [];
        acc[status].push(task);
        return acc;
    }, {});

    const columns = [
        { id: 'To Do', title: 'To Do' },
        { id: 'In Progress', title: 'In Progress' },
        { id: 'Done', title: 'Done' }
    ];

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
                <TopNavigation />
                <div className="board-header">
                    <h2 className="board-title">My Tasks</h2>
                </div>

                <div className="tasks-container">
                    {error && <div className="error-message">{error}</div>}

                    <div className="columns-container">
                        {columns.map(column => (
                            <div
                                key={column.id}
                                className={`column ${draggedOverColumn === column.id ? 'drop-target' : ''}`}
                                onDragOver={(e) => handleDragOver(e, column.id)}
                                onDragLeave={() => setDraggedOverColumn(null)}
                                onDrop={(e) => handleDrop(e, column.id)}
                            >
                                <div className="column-header">
                                    <h3 className="column-title">{column.title}</h3>
                                </div>

                                {(groupedTasks[column.id] || []).map(task => (
                                    <div
                                        key={task._id}
                                        className={`task-card ${task.priority?.toLowerCase()}-priority ${draggingTask?._id === task._id ? 'dragging' : ''
                                            } ${task.status === 'Done' ? 'done' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="task-actions">
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                setEditTask({
                                                    title: task.title,
                                                    description: task.description,
                                                    deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
                                                    priority: task.priority?.toLowerCase(),
                                                    status: task.status
                                                });
                                                setShowEditModal(true);
                                            }}>
                                                <FiEdit2 />
                                            </button>
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                setShowDeleteModal(true);
                                            }}>
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                        <h4 className="task-title">{task.title}</h4>
                                        <p className="task-description">{task.description}</p>
                                        <div className="task-footer">
                                            <span className="task-deadline">
                                                {task.deadline ? `Due: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
                                            </span>
                                            <span className="task-board">
                                                Board: {task.boardId?.name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Edit Task Modal */}
                {showEditModal && selectedTask && (
                    <div className="modal-overlay">
                        <div className="edit-task-modal">
                            <h2>Edit Task</h2>
                            {error && <div className="error-message">{error}</div>}
                            <input
                                type="text"
                                placeholder="Task title"
                                className="modal-input"
                                value={editTask.title}
                                onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                                autoFocus
                            />
                            <textarea
                                placeholder="Task description"
                                className="modal-input"
                                rows="4"
                                value={editTask.description}
                                onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                            />
                            <input
                                type="date"
                                placeholder="Deadline"
                                className="modal-input"
                                value={editTask.deadline}
                                onChange={(e) => setEditTask({ ...editTask, deadline: e.target.value })}
                            />

                            <div className="priority-select">
                                <label>Priority:</label>
                                <div className="priority-options">
                                    {['low', 'medium', 'high'].map(level => (
                                        <button
                                            key={level}
                                            className={`priority-option ${editTask.priority === level ? 'active' : ''} ${level}-priority`}
                                            onClick={() => setEditTask({ ...editTask, priority: level })}
                                            type="button"
                                        >
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    className="modal-btn cancel-btn"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setError('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="modal-btn submit-btn"
                                    onClick={updateTask}
                                    disabled={!editTask.title.trim() || loading}
                                >
                                    {loading ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Task Modal */}
                {showDeleteModal && selectedTask && (
                    <div className="modal-overlay">
                        <div className="delete-task-modal">
                            <h3>Delete this task?</h3>
                            <p>You will not be able to recover this task</p>
                            <div className="delete-task-modal-actions">
                                <button
                                    className="modal-btn cancel-btn"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedTask(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="modal-btn submit-btn"
                                    onClick={deleteTask}
                                    disabled={loading}
                                >
                                    {loading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTasksPage;