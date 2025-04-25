import React, { useState, useEffect } from 'react';
import { 
  FiLayout, FiFolder, FiCheckSquare, FiCalendar, 
  FiMessageSquare, FiSettings, FiPlus, FiTrash2, 
  FiEdit2, FiUsers, FiChevronDown, FiUserPlus 
} from 'react-icons/fi';
import { authAPI, boardAPI } from '../services/api';
import '../styles/sidebar.css';
import '../styles/top-navigation.css';
import '../styles/projects.css';

/**
 * Main board/projects management component
 * Handles project creation, editing, deletion and member management
 */
const ProjectsPage = () => {
  // State management
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI state
  const [activeNav, setActiveNav] = useState('projects');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(null);
  
  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);

  /**
   * Fetch user data and projects on component mount
   */
  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return window.location.href = '/login';
      
      try {
        const userData = await authAPI.getUserProfile();
        if (!userData?.name) throw new Error('Invalid user data');
        setUser(userData);
        await fetchProjects(userData.email);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  /**
   * Fetch projects for the current user
   * @param {string} email - User's email
   */
  const fetchProjects = async (email) => {
    try {
      const userProjects = await boardAPI.getByUser(email);
      setProjects(userProjects);
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  /**
   * Fetch member data for the selected project
   */
  useEffect(() => {
    if (selectedProject?.members) {
      fetchMemberData(selectedProject.members);
    } else {
      setMembers([]);
    }
  }, [selectedProject?.members]);

  /**
   * Fetch detailed member information
   * @param {Array} memberIds - Array of member IDs
   */
  const fetchMemberData = async (memberIds) => {
    try {
      setLoading(true);
      const membersData = [];
      
      for (let memberId of memberIds) {
        try {
          const memberData = await authAPI.getUserBasicInfoById(memberId);
          if (memberData) {
            membersData.push({
              _id: memberData._id,
              name: memberData.name || 'Unknown',
              email: memberData.email || `${memberId.substring(0, 6)}...@example.com`
            });
          }
        } catch {
          membersData.push({
            _id: memberId,
            name: 'Error loading',
            email: 'error@example.com'
          });
        }
      }
      
      setMembers(membersData);
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new project
   */
  const createProject = async () => {
    if (!newProjectName.trim()) return;
    
    setLoading(true);
    try {
      const newProject = await boardAPI.create({ 
        name: newProjectName, 
        memberEmails: [] 
      });
      
      setProjects(prev => [...prev, {
        ...newProject,
        name: newProjectName,
        tasksDone: 0,
        totalTasks: 0
      }]);
      
      setNewProjectName('');
      setShowCreateModal(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update project name
   */
  const updateProject = async () => {
    if (!editProjectName.trim() || !selectedProject) return;
    setLoading(true);
    try {
      await boardAPI.updateBoard(selectedProject._id, { name: editProjectName });
      setProjects(projects.map(project => 
        project._id === selectedProject._id ? 
        { ...project, name: editProjectName } : 
        project
      ));
      setShowEditModal(false);
      setSelectedProject(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a project
   * @param {string} projectId - ID of project to delete
   */
  const deleteProject = async (projectId) => {
    setLoading(true);
    try {
      await boardAPI.delete(projectId);
      setProjects(projects.filter(project => project._id !== projectId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setLoading(false);
      setSelectedProject(null);
    }
  };

  /**
   * Add member to project
   */
  const addMemberToProject = async () => {
    if (!newMemberEmail.trim() || !selectedProject) return;
    setLoading(true);
    try {
      await boardAPI.updateBoard(selectedProject._id, { 
        addMembers: [newMemberEmail] 
      });
      await fetchProjects(user.email);
      setNewMemberEmail('');
      setShowAddMemberModal(false);
      setSelectedProject(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove members from project
   * @param {Array} memberIds - Array of member IDs to remove
   */
  const handleRemoveMembers = async (memberIds) => {
    if (!memberIds?.length || !selectedProject?._id) return;
    
    try {
      setLoading(true);
      
      const membersToRemove = members
        .filter(member => memberIds.includes(member._id))
        .map(member => member.email);

      await boardAPI.updateBoard(selectedProject._id, {
        removeMembers: membersToRemove
      });

      setMembers(prev => prev.filter(m => !memberIds.includes(m._id)));
      setProjects(prev => prev.map(p => 
        p._id === selectedProject._id
          ? { ...p, members: p.members.filter(id => 
              !memberIds.includes(id.toString())) }
          : p
      ));
      
      setSelectedMembers([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove members");
    } finally {
      setLoading(false);
    }
  };

    /**
   * Handle project edit click
   * @param {Object} project - The project to edit
   */
  const handleEditClick = (project) => {
    setSelectedProject(project);
    setEditProjectName(project.name);
    setShowEditModal(true);
    setShowProjectMenu(null);
  };

  /**
   * Handle project delete click
   * @param {Object} project - The project to delete
   */
  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
    setShowProjectMenu(null);
  };

  // Filter projects based on active filter
  const filteredProjects = activeFilter === 'all' 
    ? projects 
    : projects.filter(p => p.type === activeFilter);

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
        <header className="top-nav">
          <div className="nav-brand">
            <h1>TaskFlow</h1>
          </div>
          <div className="user-display">
            <span className="user-name">{user.name}</span>
          </div>
        </header>
  
        <div className="projects-action-bar">
          <div className="action-buttons">
            <button 
              className="add-project-btn"
              onClick={() => setShowCreateModal(true)}
            >
              Add project
            </button>
            <div className="sort-container">
              <button className="sort-trigger">
                Sort by <FiChevronDown />
              </button>
              <div className="sort-dropdown">
                <button className="sort-option">
                  <span className="sort-number">1 968</span>
                  <span>Tasks done (most)</span>
                </button>
                <button className="sort-option">
                  <span className="sort-number">1 2</span>
                  <span>Tasks done (least)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
  
        <main className="main-content">
          {error && (
            <div className="error-message">
              {error} <button onClick={() => setError('')}>Close</button>
            </div>
          )}
          
          <div className="projects-grid">
            {filteredProjects.map(project => (
              <div key={project._id} className="project-card">
                <div className="project-actions">
                  <button onClick={() => handleEditClick(project)}>
                    <FiEdit2 />
                  </button>
                  <button onClick={() => handleDeleteClick(project)}>
                    <FiTrash2 />
                  </button>
                </div>
                <h3 className="project-name">{project.name}</h3>
                <p className="project-description">
                  {project.description || 'No description available'}
                </p>
                <div className="project-footer">
                  <span>Tasks done: {project.tasksDone || 0}/{project.totalTasks || 0}</span>
                  <button 
                    className="add-member-btn"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowMembersModal(true);
                    }}
                  >
                    <FiUsers /> Members
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal">
            <h2>Create a new project</h2>
            <div className="input-spacer">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter the name"
                className="create-modal-input"
                autoFocus
              />
            </div>
            <div className="create-modal-actions">
              <button 
                className="create-cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="create-submit-btn"
                onClick={createProject}
                disabled={!newProjectName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedProject && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h2>Edit the name</h2>
            <div className="input-spacer">
              <input
                type="text"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                placeholder="Enter new project name"
                className="edit-modal-input"
                autoFocus
              />
            </div>
            <div className="edit-modal-actions">
              <button 
                className="edit-cancel-btn"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="edit-save-btn"
                onClick={updateProject}
                disabled={!editProjectName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && selectedProject && (
       <div className="modal-overlay" style={{ zIndex: 2001 }}>
          <div className="edit-modal">
            <h2>Add member</h2>
            <div className="input-spacer">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter the email"
                className="edit-modal-input"
                autoFocus
              />
            </div>
            <div className="add-member-modal-actions">
              <button 
                className="add-member-cancel-btn"
                onClick={() => setShowAddMemberModal(false)}
              >
                Cancel
              </button>
              <button 
                className="add-member-submit-btn"
                onClick={addMemberToProject}
                disabled={!newMemberEmail.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showMembersModal && selectedProject && (
        <div className="modal-overlay">
          <div className="members-modal">
            <h2>Your Board Members</h2>
            <input
              type="text"
              placeholder="Search by name"
              className="members-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <button 
              className="add-member-btn"
              onClick={() => setShowAddMemberModal(true)
              }
              style={{ marginLeft: 'auto' }}
            >
              Add member
            </button>

            {loading && <div className="loading-indicator">Processing...</div>}
            {error && <div className="error-message">{error}</div>}

            {members.length > 0 ? (
              <div className="members-list">
                {members.map((member) => (
                  <div key={member._id} className="member-item">
                    <input
                      type="checkbox"
                      className="member-checkbox"
                      checked={selectedMembers.includes(member._id)}
                      onChange={() => {
                        setSelectedMembers(prev => 
                          prev.includes(member._id)
                            ? prev.filter(id => id !== member._id)
                            : [...prev, member._id]
                        );
                      }}
                      disabled={loading}
                    />
                    <div className="member-details">
                      <span className="member-name">{member.name}</span>
                      <span className="member-email">{member.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-members">No members yet.</p>
            )}
            
            <div className="members-modal-footer">
              <button
                className="close-btn"
                onClick={() => setShowMembersModal(false)}
                disabled={loading}
              >
                Close
              </button>
              
              {selectedMembers.length > 0 && (
                <button
                  className="delete-btn"
                  onClick={() => handleRemoveMembers(selectedMembers)}
                  disabled={loading}
                >
                  {loading ? 'Removing...' : `Delete (${selectedMembers.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Are you sure?</h3>
            <p>You will not be able to recover your project</p>
            <div className="delete-modal-actions">
              <button 
                className="delete-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                No, keep the project
              </button>
              <button 
                className="delete-confirm-btn"
                onClick={() => {
                  deleteProject(projectToDelete._id);
                  setShowDeleteModal(false);
                }}
              >
                Yes, delete the project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;