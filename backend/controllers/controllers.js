const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Board = require('../models/Board');
const Ticket = require('../models/Ticket');
const Notifications = require('../models/Notifications');
const mongoose = require('mongoose');
let io;

function setSocketInstance(ioInstance) {
    io = ioInstance;
}

//helper for sending notifications
const sendNotification = async (userId, type, message) => {
    try {
        const notification = new Notifications({
            userId,
            type,
            message,
            read: false,
        });

        await notification.save();

        if (io) {
            io.to(userId.toString()).emit('new-notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

// helper for sending notification when assigned to ticket
const notifyAssignedUsers = async (userIds, ticketTitle) => {
    const results = await Promise.all(userIds.map(async (userId) => {
        try {
            const notification = new Notifications({
                userId,
                type: 'assigned',
                message: `You have been assigned a new ticket: ${ticketTitle}`,
                read: false,
            });

            await notification.save();

            if (io) io.to(userId.toString()).emit('new-notification', notification);
            console.log(`Notification created `, notification._id);
            return { success: true, userId };
        } catch (error) {
            console.error(`Failed to notify user ${userId}:`, error);
            return { success: false, userId, error: error.message };
        }
    }));

    return results;
};


// Register
const register = async (req, res) => {
    try {
        const { name, surname, email, password,profession, dateOfBirth } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const user = new User({
            name,
            surname,
            email,
            passwordHash: password,
            profession: profession,
            dateOfBirth,
            settings: { theme: 'light' }
        });

        await user.save();
        
        // Generate token after successful registration
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profession: user.profession
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
};


// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body; // Changed from passwordHash to password
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Compare plain text password with stored hash
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
};


// Get User Profile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-passwordHash');
        if (!user) return res.status(404).send("User not found.");
        res.status(200).json(user);
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).send("Error fetching user profile.");
    }
};


// Update User Profile
const updateUserProfile = async (req, res) => {
    try {
        const updates = req.body;

        // Prevent password change via this route
        if (updates.passwordHash) {
            return res.status(400).send("Use a dedicated route to change password.");
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!updatedUser) return res.status(404).send("User not found.");

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).send("Error updating user profile.");
    }
};


// Delete User
const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.user._id);

        if (!deletedUser) return res.status(404).send("User not found.");

        res.status(200).send("User deleted successfully.");
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).send("Error deleting user.");
    }
};


// Create board
const createBoard = async (req, res) => {
    try {
        const { name, memberEmails,description } = req.body;
        const owner = req.user;

        if (!owner) {
            return res.status(400).send("Owner not found.");
        }

        // Check for duplicate board name
        const existingBoard = await Board.findOne({ name: name, owner: owner._id });
        if (existingBoard) {
            return res.status(400).send(`You already have a board named "${name}".`);
        }

        // Find all members by email
        const members = await User.find({ email: { $in: memberEmails } });
        if (members.length !== memberEmails.length) {
            return res.status(400).send("Some member emails were not found.");
        }

        // Create and save the board
        const board = new Board({
            name,
            owner: owner._id,
            members: members.map(m => m._id),
            description: description,
            tickets: []
        });

        await board.save();

        // Send notifications to all members (including owner if you want)
        const allRecipients = [...members, owner]; // Include owner if needed
        console.log('Preparing notifications for:', allRecipients.length, 'users');
        await Promise.all(
            allRecipients.map(async (user) => {
                try {
                    console.log(`Creating notification for ${user.email}`);
                    const notif = await sendNotification(
                        user._id,
                        'added-to-board',
                        `You were added to the board: ${board.name}`
                    );
                    console.log(`Notification created for ${user.email}:`, notif._id);
                    return { success: true, userId: user._id, notifId: notif._id };
                } catch (error) {
                    console.error(`FAILED notification for ${user.email}:`, error.message);
                    return { success: false, userId: user._id, error: error.message };
                }
            })
        );

        res.status(201).json(board);
    } catch (error) {
        console.error("Error creating board:", error);
        res.status(500).send("Error creating board.");
    }
};

// Get boards
const myBoards =  async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).send("User not found.");
        }

        const boards = await Board.find({
            $or: [
                { owner: user._id },
                { members: user._id }
            ]
        });

        res.status(200).json(boards);
    } catch (error) {
        res.status(500).send("Error fetching boards.");
    }
};


// get single board
const board =  async (req, res) => {
    try {
        const board = await Board.findOne({ _id: req.params.boardId, user: req.user.userId });

        if (!board) {
            return res.status(404).json({ message: 'Board not found or not authorized' });
        }

        res.json(board);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update board
const updateBoard = async (req, res) => {
    const { name, description, addMembers = [], removeMembers = [] } = req.body;
  
    try {
      const board = await Board.findOne({
        _id: req.params.boardId,
        $or: [{ owner: req.user._id }, { members: req.user._id }]
      });
  
      if (!board) {
        return res.status(404).json({ message: 'Board not found or not authorized' });
      }
  
      if (name !== undefined) board.name = name;
      if (description !== undefined) board.description = description;
  
      // Convert emails to user IDs
      const usersToAdd = await User.find({ email: { $in: addMembers } });
      const userIdsToAdd = usersToAdd.map(user => user._id);
  
      // Add new members
      board.members = [...new Set([...board.members, ...userIdsToAdd])];
  
      // Remove members
      const usersToRemove = await User.find({ email: { $in: removeMembers } });
      const userIdsToRemove = usersToRemove.map(user => user._id);
      board.members = board.members.filter(
        memberId => !userIdsToRemove.includes(memberId.toString())
      );
  
      await board.save();
        // 🔔 Send notifications to newly added members
        const allRecipients = usersToAdd;
        console.log('Preparing notifications for:', allRecipients.length, 'users');
        await Promise.all(
            allRecipients.map(async (user) => {
                try {
                    console.log(`Creating notification for ${user.email}`);
                    const notif = await sendNotification(
                        user._id,
                        'added-to-board',
                        `You were added to the board: ${board.name}`
                    );
                    console.log(`Notification created for ${user.email}:`, notif._id);
                    return { success: true, userId: user._id, notifId: notif._id };
                } catch (error) {
                    console.error(`FAILED notification for ${user.email}:`, error.message);
                    return { success: false, userId: user._id, error: error.message };
                }
            })
        );

        res.status(200).json(board);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  



// delete board
const deleteBoard = async (req, res) => {
    try {
        const { boardId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(boardId)) {
            return res.status(400).send("Invalid board ID.");
        }

        const board = await Board.findByIdAndDelete(boardId);

        if (!board) {
            return res.status(404).send("Board not found.");
        }

        // Delete all tickets belonging to this board
        await Ticket.deleteMany({ boardId: board._id });

        res.status(200).send(`Board "${board.name}" and its tickets were deleted successfully.`);
    } catch (error) {
        console.error("Error deleting board:", error);
        res.status(500).send("Error deleting board.");
    }
};


// Create ticket
const createTicket = async (req, res) => {
    try {
        const {title, description, status, assignedToEmails, boardId, priority, deadline} = req.body;

        // Check if board exists
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).send("Board not found.");
        }

        // Validate assigned users
        let assignedUserIds = [];
        if (assignedToEmails && assignedToEmails.length > 0) {
            const assignedUsers = await User.find({email: {$in: assignedToEmails
                        .map(email => email.toLowerCase())}});

            if (assignedUsers.length !== assignedToEmails.length) {
                return res.status(400).send("Some assigned users not found.");
            }

            // Ensure all assigned users are part of the board
            const validUsers = assignedUsers.filter(user =>
                board.members.includes(user._id) || board.owner.equals(user._id)
            );

            if (validUsers.length !== assignedUsers.length) {
                return res.status(403).send("One or more assigned users are not part of this board.");
            }

            assignedUserIds = validUsers.map(user => user._id);
        }

        // Create the ticket
        const ticket = new Ticket({
            title,
            description,
            status,
            assignedTo: assignedUserIds,
            boardId,
            priority,
            deadline
        });

        await ticket.save();

        board.ticketCount = (board.ticketCount || 0) + 1;
        if (ticket.status === 'Done') {
            board.completedTicketCount = (board.completedTicketCount || 0) + 1;
        }
        await board.save();

        // Notify all assigned users
        await notifyAssignedUsers(assignedUserIds, title);

        const populatedTicket = await Ticket.findById(ticket._id).populate("assignedTo", "name email");
        res.status(201).json(populatedTicket);

    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).send("Error creating ticket.");
    }
}

// Get tickets of the board
const getTickets = async (req, res) => {
    try {
        const boardId = req.params.boardId;

        // Validate the board ID format
        if (!mongoose.Types.ObjectId.isValid(boardId)) {
            return res.status(400).send("Invalid board ID format.");
        }

        // Check if the board exists
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).send("Board not found.");
        }

        // Fetch all tickets associated with the given board
        const tickets = await Ticket.find({ boardId: board._id })
            .populate("assignedTo", "name email") // Populate the `assignedTo` field to get user details (name, email)
            .exec();

        // Send the tickets as the response
        res.status(200).json(tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).send("Error fetching tickets.");
    }
};

// Get single ticket
const getSingleTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;

        // Validate ticket ID format
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).send("Invalid ticket ID format.");
        }

        // Find ticket with populated fields
        const ticket = await Ticket.findById(ticketId)
            .populate("assignedTo", "name email")
            .populate("comments.user", "name email");

        if (!ticket) {
            return res.status(404).send("Ticket not found.");
        }

        res.status(200).json(ticket);
    } catch (error) {
        console.error("Error fetching ticket:", error);
        res.status(500).send("Error fetching ticket.");
    }
};

// update ticket
const updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const {
            title,
            description,
            status,
            priority,
            deadline,
            assignedToEmails
        } = req.body;

        // Validate ticket ID
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).send("Invalid ticket ID.");
        }

        // Find the ticket
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).send("Ticket not found.");
        }

        // Find the board to validate assigned users
        const board = await Board.findById(ticket.boardId);
        if (!board) {
            return res.status(404).send("Board not found.");
        }

        // Update assignedTo if emails are provided
        let assignedUserIds = ticket.assignedTo; // Keep current users if not updated
        if (assignedToEmails && assignedToEmails.length > 0) {
            const assignedUsers = await User.find({ email: { $in: assignedToEmails } });

            if (assignedUsers.length !== assignedToEmails.length) {
                return res.status(400).send("Some assigned users not found.");
            }

            const validUsers = assignedUsers.filter(user =>
                board.members.includes(user._id) || board.owner.equals(user._id)
            );

            if (validUsers.length !== assignedUsers.length) {
                return res.status(403).send("One or more assigned users are not part of this board.");
            }

            assignedUserIds = validUsers.map(user => user._id);
        }

        const oldStatus = ticket.status;

        // Update ticket fields
        if (title !== undefined) ticket.title = title;
        if (description !== undefined) ticket.description = description;
        if (status !== undefined) ticket.status = status;
        if (priority !== undefined) ticket.priority = priority;
        if (deadline !== undefined) ticket.deadline = deadline;
        ticket.assignedTo = assignedUserIds;

        await ticket.save();

        if (status !== undefined && status !== oldStatus) {
            if (status === 'Done' && oldStatus !== 'Done') {
                board.completedTicketCount = (board.completedTicketCount || 0) + 1;
            } else if (oldStatus === 'Done' && status !== 'Done') {
                board.completedTicketCount = Math.max(0, (board.completedTicketCount || 0) - 1);
            }
            await board.save();
        }
        // Notify all assigned users
        const notificationResults = await notifyAssignedUsers(assignedUserIds, title);

        // Populate updated ticket
        const updatedTicket = await Ticket.findById(ticket._id).populate("assignedTo", "name email");

        res.status(200).json(updatedTicket);
    } catch (error) {
        console.error("Error updating ticket:", error);
        res.status(500).send("Error updating ticket.");
    }
};



// delete ticket
const deleteTicket = async (req, res) => {
    console.log("DELETE ticket endpoint hit");
    try {
        const { ticketId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).send("Invalid ticket ID.");
        }

        // Find the ticket first to get boardId
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).send("Ticket not found.");
        }

        await Ticket.findByIdAndDelete(ticketId);

        const board = await Board.findById(ticket.boardId);
        if (board) {
            board.ticketCount = Math.max(0, board.ticketCount - 1);

            if (ticket.status === 'Done') {
                board.completedTicketCount = Math.max(0, (board.completedTicketCount || 0) - 1);
            }
            await board.save();
        }

        res.status(200).send(`Ticket "${ticket.title}" deleted successfully.`);
    } catch (error) {
        console.error("Error deleting ticket:", error);
        res.status(500).send("Error deleting ticket.");
    }
};


const assignUserToTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { email } = req.body;

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).send("Invalid ticket ID.");
        }

        const ticket = await Ticket.findById(ticketId).populate("boardId");
        if (!ticket) {
            return res.status(404).send("Ticket not found.");
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found.");
        }

        // Check if user is already assigned
        if (ticket.assignedTo.some(id => id.equals(user._id))) {
            return res.status(400).send("User is already assigned to this ticket.");
        }

        // Check if user is part of the board
        const board = ticket.boardId;
        if (!board.members.includes(user._id) && !board.owner.equals(user._id)) {
            return res.status(403).send("User is not a member of the board.");
        }

        // Assign user
        ticket.assignedTo.push(user._id);
        await ticket.save();

        // Send notification
        const notification = new Notifications({
            userId: user._id,
            type: 'assigned',
            message: `You have been assigned to the ticket: ${ticket.title}`,
            read: false,
        });
        await notification.save();

        if (io) io.to(user._id.toString()).emit('new-notification', notification);
        console.log("Notification sent");

        const updated = await Ticket.findById(ticketId).populate("assignedTo", "name email");
        res.status(200).json(updated);
    } catch (error) {
        console.error("Error assigning user:", error);
        res.status(500).send("Internal server error.");
    }
};



//remove user from the ticket
const removeUserFromTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { email } = req.body;

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).send("Invalid ticket ID.");
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).send("Ticket not found.");
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found.");
        }

        // Check if user is assigned
        if (!ticket.assignedTo.includes(user._id)) {
            return res.status(400).send("User is not assigned to this ticket.");
        }

        // Remove user
        ticket.assignedTo = ticket.assignedTo.filter(
            (userId) => !userId.equals(user._id)
        );
        await ticket.save();

        const updated = await Ticket.findById(ticketId).populate("assignedTo", "name email");
        res.status(200).json(updated);
    } catch (error) {
        console.error("Error removing user:", error);
        res.status(500).send("Internal server error.");
    }
};


// Get all notifications for a user
const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await Notifications.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Create a new notification. Note: Now it is not used but might be useful in case of
//notifications which are triggered from frontend
const createNotification = async (req, res) => {
    try {
        const { userId, type, message } = req.body;
        const notification = new Notifications({
            userId,
            type,
            message,
            read: false,
        });
        await notification.save();

        if (io) io.to(userId).emit('new-notification', notification);

        res.status(201).json(notification);
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).send("Error creating notification.");
    }
};



// Mark as read notification
const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).send("Invalid notification ID.");
        }

        // Fetch only notifications belonging to the logged-in user
        const notification = await Notifications.findOne({
            _id: notificationId,
            userId: userId
        });

        if (!notification) {
            return res.status(404).send("Notification not found or access denied.");
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({ message: "Notification marked as read", notification });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).send("Error updating notification.");
    }
};


// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notifications.findByIdAndDelete(notificationId);

        if (!notification) return res.status(404).send("Notification not found.");

        if (io) io.to(notification.userId.toString()).emit('notification-deleted', notificationId);

        res.status(200).send("Notification deleted.");
    } catch (err) {
        console.error("Error deleting notification:", err);
        res.status(500).send("Error.");
    }
};


const { OpenAI } = require("openai"); // Assuming you are using the OpenAI library.

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Make sure your API key is set correctly
});

// AI assistant, task assigner
const generateTicketsFromPrompt = async (req, res) => {
    const { boardId } = req.params;
    const { description } = req.body;

    try {
        const board = await Board.findById(boardId).populate('members', 'email profession name');
        if (!board) return res.status(404).json({ message: "Board not found" });

        if (!description || description.trim().length < 10) {
            return res.status(400).json({ message: "Task description is too short." });
        }

        // AI prompt
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You're an AI project manager assistant. Given a prompt, break it into specific tasks, each with a title, optional description, profession (developer, designer, project-manager, qa-engineer, devops), and optional priority. Output should be a JSON array like:
                    [
                        { "title": "Design homepage layout", "description": "...", "profession": "designer", "priority": "medium" },
                        ...
                    ]`
                },
                {
                    role: "user",
                    content: description
                }
            ]
        });

        // Log the AI response content to inspect the structure
        const aiText = aiResponse.choices[0]?.message?.content?.trim();
        console.log(aiText);  // Log the AI response content for debugging

        let tasks = [];
        try {
            tasks = JSON.parse(aiText);  // Try parsing the content if it's a valid JSON string
        } catch (error) {
            console.error("Error parsing AI response:", error);
            tasks = [];
        }

        // Valid status and priority values as per your schema
        const validStatuses = ["To Do", "In Progress", "Done"];
        const validPriorities = ["Low", "Medium", "High"];

        const createdTickets = [];

        for (const task of tasks) {
            // Map status to valid value or default to 'To Do'
            const status = validStatuses.includes(task.status) ? task.status : "To Do";

            // Map priority to valid value or default to 'Medium'
            const priority = validPriorities.includes(task.priority) ? task.priority : "Medium";

            const assignee = board.members.find(user => user.profession === task.profession);
            if (!assignee) continue;

            const ticket = new Ticket({
                title: task.title,
                description: task.description || "",
                status: status,
                assignedTo: [assignee._id],
                boardId: board._id,
                priority: priority
            });

            await ticket.save();
            createdTickets.push(ticket);
        }

        res.status(201).json({
            message: `Created ${createdTickets.length} task(s) from AI response.`,
            tasks: createdTickets
        });

    } catch (err) {
        console.error("AI Task Gen Error:", err.response?.data || err.message, err.stack);
        res.status(500).json({ message: "Internal server error during AI task generation." });
    }
};



module.exports = {setSocketInstance, register, login,createBoard,
    myBoards,deleteBoard,createTicket,getTickets,deleteTicket,
board, updateBoard,getSingleTicket, updateTicket,assignUserToTicket,
removeUserFromTicket,getUserProfile, updateUserProfile, deleteUser,
getNotifications,createNotification,markNotificationRead, deleteNotification,
generateTicketsFromPrompt};

