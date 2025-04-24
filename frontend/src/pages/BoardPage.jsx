import React, { useState, useEffect } from 'react';
import { FiEdit2, FiUserPlus, FiTrash2 } from "react-icons/fi";
import { boardAPI } from '../services/api';
import '../styles/main.css';

const BoardPage = () => {
  const [boards, setBoards] = useState([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [editBoardName, setEditBoardName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    setIsLoading(true);
    try {
      const email = localStorage.getItem('email');
      const userBoards = await boardAPI.getByUser(email);
      setBoards(userBoards);
    } catch (err) {
      setError('Failed to load boards');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createBoard = async () => {
    if (!newBoardName.trim()) return;
    
    console.log("Creating board with name:", newBoardName); // Log before API call
    
    setIsLoading(true);
    try {
      const newBoard = await boardAPI.create({ name: newBoardName, memberEmails: [] });
      console.log("API Response:", newBoard); // Log the API response

      console.log("New board name before state update:", newBoardName);
      
      // Ensure newBoard object is well-formed and only add the necessary properties
      const updatedBoard = {
        ...newBoard, // The response from the API should have the right structure
        name: newBoardName, // Explicitly ensure the name is set correctly
        _id: newBoard._id || Date.now().toString() // Ensure the ID is set properly
      };

      console.log("Updated board before state update:", updatedBoard);

      // Updating boards state
      setBoards(prev => {
        const updatedBoards = [
          ...prev,
          updatedBoard // Add the newly created board
        ];
        console.log("Updated boards state:", updatedBoards); // Log updated state
        return updatedBoards;
      });
      
      setNewBoardName('');
      console.log("New board name after creation:", newBoardName); // Log after name reset
      
      setShowCreateModal(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create board');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  

  const deleteBoard = async (boardId) => {
    setIsLoading(true);
    try {
      await boardAPI.delete(boardId);
      setBoards(boards.filter(board => board._id !== boardId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete board');
      console.error(err);
    } finally {
      setIsLoading(false);
      setSelectedBoard(null);
      setShowBoardMenu(null);
    }
  };
  
  const handleDeleteClick = (board) => {
    setBoardToDelete(board);
    setShowDeleteModal(true);
    setShowBoardMenu(null); // Close the menu
  };

  const updateBoard = async () => {
    if (!editBoardName.trim() || !selectedBoard) return;
    setIsLoading(true);
    try {
      await boardAPI.updateBoard(selectedBoard._id, { name: editBoardName });
      setBoards(boards.map(board => board._id === selectedBoard._id ? { ...board, name: editBoardName } : board));
      setShowEditModal(false);
      setSelectedBoard(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update board');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addMemberToBoard = async () => {
    if (!newMemberEmail.trim() || !selectedBoard) return;
    setIsLoading(true);
    try {
      await boardAPI.updateBoard(selectedBoard._id, { addMembers: [newMemberEmail] });
      await fetchBoards();
      setNewMemberEmail('');
      setShowAddMemberModal(false);
      setSelectedBoard(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModals = () => {
    setShowEditModal(false);
    setShowAddMemberModal(false);
    setSelectedBoard(null);
  };

  const handleEditClick = (board) => {
    setSelectedBoard(board);
    setEditBoardName(board.name);
    setShowEditModal(true);
    setShowBoardMenu(null);
  };

  return (
    <div className="board-page-container">
      {error && (
        <div className="error-message">
          {error} <button onClick={() => setError('')}>Close</button>
        </div>
      )}

      {isLoading && <div className="loading-spinner">Loading...</div>}

      <div className="board-list-container">
        {boards.map((board) => (
          <div 
          key={board._id} 
          className={`board-card ${showBoardMenu === board._id ? 'has-menu-open' : ''}`}
          onClick={(e) => {
            // Close menu when clicking elsewhere on the card
            if (showBoardMenu === board._id) {
              setShowBoardMenu(null);
            }
          }}
          >
            <div className="board-card-header">
              <h3>{board.name}</h3>
              <div className="board-actions-container">
                <button
                  className="board-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBoardMenu(showBoardMenu === board._id ? null : board._id);
                  }}
                >
                  ⋮
                </button>

                {showBoardMenu === board._id && (
                  <div className="board-menu">
                    <div className="board-menu-item" onClick={() => handleEditClick(board)}>
                      <FiEdit2 /> <span>Edit Name</span>
                    </div>
                    <div className="board-menu-item" onClick={() => { setSelectedBoard(board); setShowAddMemberModal(true); }}>
                      <FiUserPlus /> <span>Add Member</span>
                    </div>
                    <div 
                      className="board-menu-item delete" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(board);
                      }}
                    >
                      <FiTrash2 /> <span>Delete Board</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <button className="board-card create-new-btn" onClick={() => setShowCreateModal(true)} disabled={isLoading}>
          <h3>Create new board</h3>
        </button>
      </div>

      {/* Modals remain unchanged */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal">
            <h2>Create a new board</h2>
            <p>Name your new board to get started</p>
            
            <div className="input-spacer">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
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
                onClick={createBoard}
                disabled={!newBoardName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedBoard && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h2>Edit the name</h2>
            <p>Enter a new name for your project</p>
          
            <div className="input-spacer">
              <input
                type="text"
                value={editBoardName}
                onChange={(e) => setEditBoardName(e.target.value)}
                placeholder="Enter new project name"
                className="edit-modal-input"
                autoFocus // Focus input automatically
              />
            </div>
            
            <div className="edit-modal-actions">
              <button 
                className="edit-cancel-btn"
                onClick={closeModals} // Only way to close
              >
                <span>Cancel</span>
              </button>
              <button 
                className="edit-save-btn"
                onClick={updateBoard}
                disabled={!editBoardName.trim()}
              >
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && selectedBoard && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h2>Add member</h2>
            <p className="modal-subtitle">Add a member to collaborate easily</p>
          
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
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedBoard(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="add-member-submit-btn"
                onClick={addMemberToBoard}
                disabled={!newMemberEmail.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Are you sure?</h3>
            <p>You will not be able to recover your project</p>
            <div className="delete-modal-actions">
              <button 
                className="delete-confirm-btn"
                onClick={() => {
                  deleteBoard(boardToDelete._id);
                  setShowDeleteModal(false);
                }}
              >
                Yes, delete the project
              </button>
              <button 
                className="delete-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                No, keep the project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage; 