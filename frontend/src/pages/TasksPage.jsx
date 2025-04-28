import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiLayout, FiFolder, FiCheckSquare, FiCalendar, 
  FiMessageSquare, FiSettings, FiPlus, FiTrash2, 
  FiEdit2, FiUsers, FiUserPlus 
} from 'react-icons/fi';
import { authAPI, taskAPI, boardAPI } from '../services/api';
import '../styles/sidebar.css';
import '../styles/top-navigation.css';
import '../styles/tasks.css';

const TasksPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [boardName, setBoardName] = useState('');
  const [members, setMembers] = useState([]);
  
  // UI state
  const [activeNav, setActiveNav] = useState('tasks');
  const [draggingTask, setDraggingTask] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskAssignees, setTaskAssignees] = useState([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'low',
    assignedToEmails: [],
    status: 'To Do'
  });

  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'low',
    assignedToEmails: [],
    status: 'To Do'
  });

  // Comment state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentFile, setCommentFile] = useState(null);

  // Email input state
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      
      try {
        const [userData, boardData] = await Promise.all([
          authAPI.getUserProfile(),
          boardAPI.getBoard(boardId)
        ]);
        
        setUser(userData);
        setBoardName(boardData.name);
        await fetchTasks();
        await fetchMembers();
      } catch (error) {
        setError('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [boardId, navigate]);

  useEffect(() => {
    const fetchAssignees = async () => {
      if (showMembersModal && selectedTask) {
        try {
          setLoading(true);
          const response = await taskAPI.getTicketAssignees(selectedTask._id);
          setTaskAssignees(response.assignees);
        } catch (error) {
          setError('Failed to load task members');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAssignees();
  }, [showMembersModal, selectedTask]);

  // Fetch tasks for the board
  const fetchTasks = async () => {
    try {
      if (!boardId || boardId.length !== 24) {
        throw new Error('Invalid board ID format');
      }
      const boardTasks = await taskAPI.getTickets(boardId);
      setTasks(boardTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Invalid board ID or server error');
    }
  };

  // Fetch board members
  const fetchMembers = async () => {
    try {
      const board = await boardAPI.getBoard(boardId);
      const memberData = await Promise.all(
        board.members.map(memberId => 
          authAPI.getUserBasicInfoById(memberId)
        )
      );
      setMembers(memberData.filter(m => m));
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  // Fetch comments for a task
  const fetchComments = async (taskId) => {
    try {
      setLoading(true);
      const taskComments = await taskAPI.getCommentsForTicket(taskId);
      setComments(taskComments);
    } catch (err) {
      setError('Failed to load comments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle task creation
  const createTask = async () => {
    if (!newTask.title.trim()) {
      setError('Title is required');
      return;
    }
  
    setLoading(true);
    try {
      const createdTask = await taskAPI.createTicket({
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        boardId: boardId,
        priority: newTask.priority.charAt(0).toUpperCase() + newTask.priority.slice(1),
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
        assignedToEmails: newTask.assignedToEmails,
        status: 'To Do'
      });
  
      const completeTask = {
        ...createdTask,
        assignedTo: createdTask.assignedTo || [],
        boardId: createdTask.boardId || boardId,
        _id: createdTask._id
      };
  
      setTasks(prev => [completeTask, ...prev]);
      await fetchTasks();
  
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        deadline: '',
        priority: 'low',
        assignedToEmails: [],
        status: 'To Do'
      });
      setEmailInput('');
      setError('');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                         'Failed to create task. Please check assigned users.';
      setError(errorMessage);
      await fetchTasks();
    } finally {
      setLoading(false);
    }
  };

  // Handle task update
  const updateTask = async () => {
    if (!editTask.title.trim() || !selectedTask) return;
    
    setLoading(true);
    const previousTasks = tasks;
    
    try {
      setTasks(prev => prev.map(task => 
        task._id === selectedTask._id ? {
          ...task,
          ...editTask,
          priority: editTask.priority.charAt(0).toUpperCase() + editTask.priority.slice(1),
          deadline: editTask.deadline ? new Date(editTask.deadline).toISOString() : null
        } : task
      ));
  
      const updatedTask = await taskAPI.updateTicket(selectedTask._id, {
        title: editTask.title.trim(),
        description: editTask.description.trim(),
        priority: editTask.priority.charAt(0).toUpperCase() + editTask.priority.slice(1),
        deadline: editTask.deadline ? new Date(editTask.deadline).toISOString() : null,
        assignedToEmails: editTask.assignedToEmails,
        status: editTask.status
      });
  
      setTasks(prev => prev.map(task => 
        task._id === selectedTask._id ? {
          ...updatedTask,
          _id: updatedTask._id || selectedTask._id,
          boardId: updatedTask.boardId || selectedTask.boardId
        } : task
      ));
  
      setShowEditModal(false);
      setSelectedTask(null);
      setError('');
    } catch (error) {
      setTasks(previousTasks);
      setError(error.response?.data?.error || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const addMemberToTask = async () => {
    if (!newMemberEmail.trim() || !selectedTask) return;
    
    setLoading(true);
    try {
      // Optimistically update the UI
      const newMember = {
        email: newMemberEmail,
        name: 'Loading...' // Temporary placeholder
      };
      setTaskAssignees(prev => [...prev, newMember]);
      setShowAddMemberModal(false);
      setNewMemberEmail('');
  
      // Make the API call
      await taskAPI.assignUserToTicket(selectedTask._id, { email: newMemberEmail });
      
      // Refresh the data from server to get complete member info
      const response = await taskAPI.getTicketAssignees(selectedTask._id);
      setTaskAssignees(response.assignees);
      
      setError('');
    } catch (error) {
      // Rollback on error
      setTaskAssignees(prev => prev.filter(m => m.email !== newMemberEmail));
      setError(error.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // Handle removing members from task
  const removeMembersFromTask = async () => {
    if (!selectedMembers.length || !selectedTask) return;
    
    setLoading(true);
    try {
      // Optimistically update UI
      const updatedAssignees = taskAssignees.filter(
        member => !selectedMembers.includes(member.email)
      );
      setTaskAssignees(updatedAssignees);
  
      // Make API calls to remove members
      await Promise.all(
        selectedMembers.map(email => 
          taskAPI.removeUserFromTicket(selectedTask._id, { email })
        )
      );
  
      // Refresh data from server to confirm
      const response = await taskAPI.getTicketAssignees(selectedTask._id);
      setTaskAssignees(response.assignees);
      
      // Clear selection but keep modal open
      setSelectedMembers([]);
      setError('');
    } catch (error) {
      // Revert on error
      const response = await taskAPI.getTicketAssignees(selectedTask._id);
      setTaskAssignees(response.assignees);
      setError(error.response?.data?.message || 'Failed to remove members');
    } finally {
      setLoading(false);
    }
  };

  // Handle task deletion
  const deleteTask = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    const previousTasks = tasks;
    
    try {
      setTasks(prev => prev.filter(task => task._id !== selectedTask._id));
      await taskAPI.deleteTicket(selectedTask._id);
      await fetchTasks();
      setShowDeleteModal(false);
      setSelectedTask(null);
    } catch (error) {
      setTasks(previousTasks);
      setError('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding comment
  const addComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', user._id);
      formData.append('text', newComment);
      if (commentFile) {
        formData.append('attachment', commentFile);
      }
  
      const createdComment = await taskAPI.addComment(selectedTask._id, formData);
      
      setComments(prev => [createdComment, ...prev]);
      setNewComment('');
      setCommentFile(null);
      setError('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting comment
  const deleteComment = async (commentId) => {
    if (!commentId || !selectedTask) return;
    
    setLoading(true);
    try {
      await taskAPI.deleteComment(selectedTask._id, commentId);
      setComments(prev => prev.filter(comment => comment._id !== commentId));
    } catch (error) {
      setError('Failed to delete comment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Email input handlers
  const handleEmailKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      addEmail();
    }
  };

  const addEmail = () => {
    if (!emailInput.trim()) return;

    const email = emailInput.trim();
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (newTask.assignedToEmails.includes(email)) {
      setEmailError('This email is already added');
      return;
    }

    setNewTask({
      ...newTask,
      assignedToEmails: [...newTask.assignedToEmails, email]
    });
    setEmailInput('');
    setEmailError('');
  };

  const removeEmail = (emailToRemove) => {
    setNewTask({
      ...newTask,
      assignedToEmails: newTask.assignedToEmails.filter(email => email !== emailToRemove)
    });
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Handle file selection for comments
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCommentFile(e.target.files[0]);
    }
  };

  // Handle drag and drop
  const handleDragStart = (e, task) => {
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task._id);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleDragEnd = () => {
    setDraggedOverColumn(null);
    setDraggingTask(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggingTask || draggingTask.status === newStatus) {
      setDraggedOverColumn(null);
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      setTasks(prev => prev.map(task => 
        task._id === draggingTask._id ? { 
          ...task, 
          status: newStatus === 'Completed' ? 'Done' : newStatus 
        } : task
      ));
      
      await taskAPI.updateTicket(draggingTask._id, {
        status: newStatus === 'Completed' ? 'Done' : newStatus
      });
    } catch (err) {
      setError('Failed to update task status');
      setTasks(prev => prev.map(task => 
        task._id === draggingTask._id ? { ...task, status: draggingTask.status } : task
      ));
    } finally {
      setDraggingTask(null);
      setDraggedOverColumn(null);
      setIsUpdatingStatus(false);
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
    { id: 'To Do', title: 'To Do', canAdd: true },
    { id: 'In Progress', title: 'In Progress', canAdd: false },
    { id: 'Done', title: 'Done', canAdd: false }
  ];

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <div className="error">Failed to load user information</div>;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <ul className="sidebar-menu">
          {[
            { icon: <FiLayout />, name: 'Dashboard', id: 'dashboard' },
            { icon: <FiFolder />, name: 'Projects', id: 'projects' },
            { icon: <FiCheckSquare />, name: 'My Tasks', id: 'tasks' },
            { icon: <FiCalendar />, name: 'Calendar', id: 'calendar' },
            { icon: <FiMessageSquare />, name: 'Conversation', id: 'conversation' },
            { icon: <FiSettings />, name: 'Settings', id: 'settings' }
          ].map((item) => (
            <li 
              key={item.id}
              className={`sidebar-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.name}
            </li>
          ))}
        </ul>
      </nav>
  
      {/* Main Content Area */}
      <div className="content-area">
      // In BoardPage.jsx, update the top-nav section:
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

        <div className="board-header">
          <div className="board-title-container">
            <h2 className="board-title">Board - {boardName}</h2>
          </div>
          <button 
            className="add-task-button"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> Add task
          </button>
        </div>
  
        <div className="tasks-container">
          <div className="columns-container">
            {columns.map(column => (
              <div 
                key={column.id}
                className={`column ${draggedOverColumn === column.id ? 'drop-target' : ''} ${
                  column.id === 'Done' ? 'done-column' : ''
                }`}
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
                    className={`task-card ${task.priority?.toLowerCase()}-priority ${
                      draggingTask?._id === task._id ? 'dragging' : ''
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
                          assignedToEmails: task.assignedTo?.map(user => user.email) || [],
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
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                        setShowMembersModal(true);
                      }}>
                        <FiUsers />
                      </button>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                        await fetchComments(task._id);
                        setShowCommentsModal(true);
                      }}>
                        <FiMessageSquare />
                      </button>
                    </div>
                    <h4 className="task-title">{task.title}</h4>
                    <p className="task-description">{task.description}</p>
                    <div className="task-footer">
                      <span className="task-deadline">
                        {task.deadline ? `Due: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-task-modal">
            <h2>Create a task</h2>
            {error && <div className="error-message">{error}</div>}
            <input
              type="text"
              placeholder="Enter a name"
              className="modal-input"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              autoFocus
            />
            <textarea
              placeholder="Enter a description..."
              className="modal-input"
              rows="4"
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
            />
            <input
              type="date"
              placeholder="yyyy-mm-dd"
              className="modal-input"
              value={newTask.deadline}
              onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
            />
            
            <div className="email-input-container">
              <label>Assign to:</label>
              <div className="email-chips">
                {newTask.assignedToEmails.map(email => (
                  <div key={email} className="email-chip">
                    {email}
                    <button type="button" onClick={() => removeEmail(email)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Enter email and press Enter/Tab"
                className="email-input"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setEmailError('');
                }}
                onKeyDown={handleEmailKeyDown}
                onBlur={addEmail}
              />
              {emailError && <div className="error-message">{emailError}</div>}
            </div>

            <div className="priority-select">
              <label>Priority:</label>
              <div className="priority-options">
                {['low', 'medium', 'high'].map(level => (
                  <button
                    key={level}
                    className={`priority-option ${newTask.priority === level ? 'active' : ''} ${level}-priority`}
                    onClick={() => setNewTask({...newTask, priority: level})}
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
                  setShowCreateModal(false);
                  setError('');
                  setEmailError('');
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn submit-btn"
                onClick={createTask}
                disabled={!newTask.title.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedTask && (
        <div className="modal-overlay">
          <div className="comments-modal">
            <div className="comments-modal-header">
              <h2>Comments for: {selectedTask.title}</h2>
              <button 
                className="close-modal-btn"
                onClick={() => {
                  setShowCommentsModal(false);
                  setComments([]);
                  setSelectedTask(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="comments-container">
              {loading ? (
                <div className="loading-indicator">Loading comments...</div>
              ) : comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment._id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.user?.name || 'Unknown user'}
                      </span>
                      <span className="comment-date">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      {comment.user?._id === user._id && (
                        <button 
                          className="delete-comment-btn"
                          onClick={() => deleteComment(comment._id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="comment-text">{comment.text}</div>
                    {comment.attachment && (
                      <div className="comment-attachment">
                        <a 
                          href={`/uploads/${comment.attachment}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          View Attachment
                        </a>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-comments">No comments yet</div>
              )}
            </div>
            
            <div className="add-comment-section">
              <textarea
                placeholder="Add a comment..."
                className="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loading}
              />
              <div className="comment-actions">
                <div className="file-upload">
                  <label>
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                    Attach File
                  </label>
                  {commentFile && (
                    <span className="file-name">
                      {commentFile.name}
                      <button 
                        onClick={() => setCommentFile(null)}
                        className="remove-file-btn"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
                <button
                  className="add-comment-btn"
                  onClick={addComment}
                  disabled={!newComment.trim() || loading}
                >
                  {loading ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="modal-overlay">
          <div className="edit-task-modal">
            <h2>Edit task</h2>
            {error && <div className="error-message">{error}</div>}
            <input
              type="text"
              placeholder="Task title"
              className="modal-input"
              value={editTask.title}
              onChange={(e) => setEditTask({...editTask, title: e.target.value})}
              autoFocus
            />
            <textarea
              placeholder="Task description"
              className="modal-input"
              rows="4"
              value={editTask.description}
              onChange={(e) => setEditTask({...editTask, description: e.target.value})}
            />
            <input
              type="date"
              placeholder="Deadline"
              className="modal-input"
              value={editTask.deadline}
              onChange={(e) => setEditTask({...editTask, deadline: e.target.value})}
            />
            
            <div className="priority-select">
              <label>Priority:</label>
              <div className="priority-options">
                {['low', 'medium', 'high'].map(level => (
                  <button
                    key={level}
                    className={`priority-option ${editTask.priority === level ? 'active' : ''} ${level}-priority`}
                    onClick={() => setEditTask({...editTask, priority: level})}
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

      {/* Task Members Modal */}
      {showMembersModal && selectedTask && (
        <div className="modal-overlay">
          <div className="members-task-modal">
            <div className="members-task-modal-header">
              <h2>Task Members</h2>
            </div>
            
            <input
              type="text"
              placeholder="Search by name or email"
              className="members-task-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
              <button 
                className="add-member-task-btn"
                onClick={() => setShowAddMemberModal(true)}
              >
                Add member
              </button>
            </div>
            
            {loading ? (
              <div className="loading-indicator">Loading members...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : taskAssignees?.length > 0 ? (
              <div className="members-task-list">
                {taskAssignees
                  .filter(assignee => {
                    const name = assignee?.name || 'No name';
                    const email = assignee?.email || 'No email';
                    const search = searchTerm.toLowerCase();
                    return (
                      name.toLowerCase().includes(search) ||
                      email.toLowerCase().includes(search)
                    );
                  })
                  .map((assignee) => {
                    const displayName = assignee?.name || 'No name';
                    const displayEmail = assignee?.email || 'No email';
                    
                    return (
                      <div key={assignee?._id || displayEmail} className="member-task-item">
                        <input
                          type="checkbox"
                          className="member-task-checkbox"
                          checked={selectedMembers.includes(displayEmail)}
                          onChange={() => {
                            if (!displayEmail || displayEmail === 'No email') return;
                            setSelectedMembers(prev => 
                              prev.includes(displayEmail)
                                ? prev.filter(email => email !== displayEmail)
                                : [...prev, displayEmail]
                            );
                          }}
                        />
                        <div className="member-task-details">
                          <span className="member-task-name">
                            {displayName}
                          </span>
                          <span className="member-task-email">
                            {displayEmail}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="no-members">No members assigned to this task.</p>
            )}
            
            <div className="members-task-modal-footer">
              <button
                className="modal-btn cancel-btn"
                onClick={() => {
                  setShowMembersModal(false);
                  setSelectedMembers([]);
                  setTaskAssignees([]);
                }}
              >
                Close
              </button>
              
              {selectedMembers.length > 0 && (
                <button
                  className="modal-btn submit-btn"
                  onClick={removeMembersFromTask}
                  disabled={loading}
                >
                  {loading ? 'Removing...' : `Remove (${selectedMembers.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedTask && (
        <div className="modal-overlay">
          <div className="edit-task-modal">
            <h2>Add Member</h2>
            {error && <div className="error-message">{error}</div>}
            <input
              type="email"
              placeholder="Enter member email"
              className="modal-input"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              autoFocus
            />
            
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setNewMemberEmail('');
                  setError('');
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn submit-btn"
                onClick={addMemberToTask}
                disabled={!newMemberEmail.trim() || loading}
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;