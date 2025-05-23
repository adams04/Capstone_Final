import axios from 'axios';

const API = axios.create({
  baseURL:
      process.env.NODE_ENV === "development"
          ? "http://localhost:5001/api"
          : "https://taskflow-backend-nhjz.onrender.com/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});


// Request interceptor
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Groups
export const authAPI = {

  login: async (credentials) => {
    const { data } = await API.post('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    return data;
  },
  register: async (userData) => {
    const { data } = await API.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },

  getUserProfile: async () => {
    const response = await API.get('/auth/user-profile');
    return response.data;
  },

  getMembers: async (boardId) => {
    try {
      const { data } = await API.get(`/boards/${boardId}/members`);
      return data;
    } catch (error) {
      console.error('Error fetching board members:', error);
      throw error;
    }
  },

  getUserBasicInfoById: async (userID) => {
    try {
      const response = await API.get(`/auth/user/${userID}/basic-info`);
      return response.data;
    } catch (error) {
      console.error("Error fetching basic user info:", error);
      throw error;
    }
  },

  getNotifications: async (userId) => {
    try {
      const response = await API.get(`/auth/notifications/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },
  

  markNotificationRead: async (notificationId) => {
    try {
      const response = API.patch(`/auth/${notificationId}/mark-read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const response = await API.delete(`/auth/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

};

export const boardAPI = {
  create: async (boardData) => {
    const { data } = await API.post('/auth/create-board', boardData);
    return data;
  },
  getAll: async () => {
    const { data } = await API.get('/auth/boards');
    return data;
  },
  getBoard: async (boardId) => {
    const { data } = await API.get(`/auth/${boardId}`);
    return data;
  },
  getByUser: async (email) => {
    const { data } = await API.get(`/auth/users/${email}/boards`);
    return data;
  },
  updateBoard: async (boardId, updateData) => {
    const { data } = await API.put(`/auth/${boardId}`, updateData);
    return data;
  },
  // MODIFIED: Fix the delete endpoint to match your backend route
  delete: async (boardId) => {
    const { data } = await API.delete(`/auth/delete-board/${boardId}`);
    return data;
  },

  removeMembers: async (boardId, emails) => {
    try {
      const { data } = await API.put(`/auth/${boardId}`, {
        removeMembers: emails
      });
      return data;
    } catch (error) {
      console.error('Error removing members:', error);
      throw error;
    }
  }
};

// In your api.js file, add these to the taskAPI object:

export const taskAPI = {

  getTickets: async (boardId) => {
    try {
      if (!boardId || !isValidObjectId(boardId)) {
        throw new Error('Invalid board ID');
      }
      const { data } = await API.get(`/auth/tickets/${boardId}`);
      return data;
    } catch (error) {
      console.error('GET Tickets Error:', error);
      throw error;
    }
  },

  createTicket: async (taskData) => {
    try {
      // Validate required fields
      if (!taskData.title?.trim() || !taskData.boardId) {
        throw new Error('Title and board ID are required');
      }

      const payload = {
        title: taskData.title.trim(),
        description: taskData.description || '',
        boardId: taskData.boardId,
        status: taskData.status || 'To Do',
        priority: taskData.priority || 'Medium',
        deadline: taskData.deadline || null,
        assignedToEmails: taskData.assignedToEmails
      };

      console.log(payload);
      const { data } = await API.post('/auth/create-ticket', payload);
      return data;


    } catch (error) {
      console.error('Create Ticket Error:', {
        request: error.config?.data,
        response: error.response?.data
      });
      throw error;
    }

  },

  updateTicket: async (id, data) => {
    try {
      const response = await API.put(`/auth/tickets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update failed - Full error:', {
        config: error.config,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  getMyTickets: async () => {
    try {
      const response = await API.get('/auth/my-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  },

  getTicketAssignees: async (ticketId) => {
    try {
      const { data } = await API.get(`/auth/tickets/${ticketId}/assignees`);
      return data;
    } catch (error) {
      console.error('Get Assignees Error:', error);
      throw error;
    }
  },

  deleteTicket: async (ticketId) => {
    try {
      const { data } = await API.delete(`/auth/delete-ticket/${ticketId}`);
      return data;
    } catch (error) {
      console.error('Delete Ticket Error:', error);
      throw error;
    }
  },

  assignUserToTicket: async (ticketId, { email }) => {
    try {
      const { data } = await API.put(`/auth/tickets/${ticketId}/assign`, { email });
      return data;
    } catch (error) {
      console.error('Assign User Error:', error);
      throw error;
    }
  },

  removeUserFromTicket: async (ticketId, { email }) => {
    try {
      const { data } = await API.put(`/auth/tickets/${ticketId}/remove`, { email });
      return data;
    } catch (error) {
      console.error('Remove User Error:', error);
      throw error;
    }
  },

  // Get comments for a ticket
  getCommentsForTicket: async (ticketId) => {
    try {
      const response = await API.get(`/auth/tickets/${ticketId}/comments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  // Add a comment to a ticket
  addComment: async (ticketId, formData) => {
    try {
      const response = await API.post(
        `/auth/tickets/${ticketId}/comments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  // Delete a comment
  deleteComment: async (ticketId, commentId) => {
    try {
      const response = await API.delete(`/auth/tickets/${ticketId}/comments/${commentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  generateTicketsFromPrompt: async (boardId, { description }) => {
    try {
      const { data } = await API.post(`/auth/ai-helper/${boardId}`, { description });
      return data;
    } catch (error) {
      console.error('AI Task Generation Error:', {
        request: { boardId, description },
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  generateDailyStandup: async (boardId) => {
    try {
      const { data } = await API.get(`/auth/ai-standup/${boardId}`);
      // Ensure the response matches what your backend sends
      if (!data.standup) {
        throw new Error('Standup content not found in response');
      }
      return {
        standup: data.standup,
        message: data.message || 'Standup generated successfully'
      };
    } catch (error) {
      console.error('Standup Generation Error:', error);
      throw error;
    }
  },

  getCalendarEvents: async () => {
    try {
      const { data } = await API.get('/auth/calendar');
      return data;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  },

};

export const settingsAPI = {
  updateUserProfile: async (userData) => {
    try {
      const response = await API.put('/auth/update-profile', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error; // Make sure to throw the error for handling in the component
    }
  },

  uploadProfilePicture: async (formData) => {
    try {
      const response = await API.post('/auth/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  // Add this to prevent the need for page reload
  getUserProfile: async () => {
    try {
      const response = await API.get('/auth/user-profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await API.put('/auth/user/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },
};




function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default API;