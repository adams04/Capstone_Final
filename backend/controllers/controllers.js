const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Board = require('../models/Board');
const Ticket = require('../models/Ticket');
const Notifications = require('../models/Notifications');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const { Types } = require('mongoose');
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

// Get name and email of user by giving ID

const getUserBasicInfoById = async (req, res) => {
    const { userID } = req.params;

    try {
        const user = await User.findById(userID).select('name email');
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json({
            name: user.name,
            email: user.email
        });
    } catch (err) {
        console.error("Error fetching basic info:", err);
        res.status(500).json({ error: "Internal server error" });
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
    const { boardId } = req.params;

    try {
        // 1. Find the board with owner/member authorization
        const board = await Board.findOne({
            _id: boardId,
            $or: [{ owner: req.user._id }, { members: req.user._id }]
        }).populate('members', '_id email');

        if (!board) {
            return res.status(404).json({ 
                success: false,
                message: 'Board not found or not authorized' 
            });
        }

        // 2. Debug logs for tracking
        console.log('\nCurrent board members:', board.members.map(m => ({
            _id: m._id,
            email: m.email
        })));
        console.log('Request to remove members:', removeMembers);

        // 3. Update basic fields if provided
        if (name !== undefined) board.name = name;
        if (description !== undefined) board.description = description;

        // 4. Handle member additions
        if (addMembers.length > 0) {
            const usersToAdd = await User.find({ email: { $in: addMembers } });
            const userIdsToAdd = usersToAdd.map(user => user._id);
            
            // Filter out duplicates
            const existingMemberIds = board.members.map(m => m._id.toString());
            const newMembers = userIdsToAdd.filter(
                id => !existingMemberIds.includes(id.toString())
            );
            
            board.members = [...board.members, ...newMembers];
            console.log(`Added ${newMembers.length} new members`);
        }

        // 5. Handle member removals (fixed implementation)
        if (removeMembers.length > 0) {
            const usersToRemove = await User.find({ email: { $in: removeMembers } });
            
            // Validate all requested members exist
            const foundEmails = usersToRemove.map(u => u.email);
            const missingEmails = removeMembers.filter(e => !foundEmails.includes(e));
            
            if (missingEmails.length > 0) {
                console.warn('Some members not found:', missingEmails);
            }

            const userIdsToRemove = usersToRemove.map(u => u._id.toString());
            
            // Proper ID comparison
            const initialCount = board.members.length;
            board.members = board.members.filter(member => 
                !userIdsToRemove.includes(member._id.toString())
            );
            
            const removedCount = initialCount - board.members.length;
            console.log(`Removed ${removedCount} members`);
        }

        // 6. Save changes
        const updatedBoard = await board.save();
        
        // 7. Send notifications for newly added members
        if (addMembers.length > 0) {
            const newUsers = await User.find({ email: { $in: addMembers } });
            await Promise.all(
                newUsers.map(async (user) => {
                    try {
                        await sendNotification(
                            user._id,
                            'added-to-board',
                            `You were added to board: ${board.name}`
                        );
                    } catch (err) {
                        console.error(`Notification failed for ${user.email}:`, err);
                    }
                })
            );
        }

        // 8. Return success response
        res.status(200).json({
            success: true,
            message: 'Board updated successfully',
            board: updatedBoard,
            addedCount: addMembers.length,
            removedCount: removeMembers.length
        });

    } catch (error) {
        console.error('\nUpdate board error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during board update',
            error: error.message
        });
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
        console.log("Request body:", req.body);
        const { title, description, status, assignedToEmails, boardId, priority, deadline } = req.body;

        // Validate required fields
        if (!title?.trim() || !boardId) {
            return res.status(400).json({ message: "Title and board ID are required." });
        }

        // Check if board exists and populate members
        const board = await Board.findById(boardId).populate('members');
        if (!board) {
            return res.status(404).json({ message: "Board not found." });
        }

        // Validate assigned users
        let assignedUserIds = [];
        if (assignedToEmails && assignedToEmails.length > 0) {
            // Find users by exact email match
            const assignedUsers = await User.find({ 
                email: { $in: assignedToEmails } 
            });

            // Check if all emails were found
            if (assignedUsers.length !== assignedToEmails.length) {
                const foundEmails = assignedUsers.map(user => user.email);
                const missingEmails = assignedToEmails.filter(email => 
                    !foundEmails.includes(email)
                );
                return res.status(400).json({ 
                    message: "Some assigned users not found in database.",
                    missingEmails
                });
            }

            // Convert board members and owner to string IDs for comparison
            const boardMemberIds = board.members.map(member => member._id.toString());
            const boardOwnerId = board.owner._id.toString();

            // Check board membership
            const validUsers = assignedUsers.filter(user => {
                const userId = user._id.toString();
                return boardMemberIds.includes(userId) || userId === boardOwnerId;
            });

            if (validUsers.length !== assignedUsers.length) {
                const invalidUsers = assignedUsers.filter(user => {
                    const userId = user._id.toString();
                    return !boardMemberIds.includes(userId) && userId !== boardOwnerId;
                });
                return res.status(403).json({
                    message: "Some users are not board members",
                    invalidUsers: invalidUsers.map(u => u.email)
                });
            }

            assignedUserIds = validUsers.map(user => user._id);
        }

        // Create the ticket
        const ticket = new Ticket({
            title: title.trim(),
            description: description || '',
            status: status || 'To Do',
            assignedTo: assignedUserIds,
            boardId,
            priority: priority || 'Medium',
            deadline: deadline || null
        });

        await ticket.save();

        // Update board statistics
        board.ticketCount = (board.ticketCount || 0) + 1;
        if (ticket.status === 'Done') {
            board.completedTicketCount = (board.completedTicketCount || 0) + 1;
        }
        await board.save();

        // Notify assigned users
        if (assignedUserIds.length > 0) {
            await notifyAssignedUsers(assignedUserIds, title);
        }

        const populatedTicket = await Ticket.findById(ticket._id)
            .populate("assignedTo", "name email")
            .populate("boardId", "title members"); // Add board population

        res.status(201).json({
            message: "Ticket created successfully",
            ticket: {
                ...populatedTicket.toObject(),
                // Ensure all fields needed for editing are included
                assignedToEmails: assignedToEmails || [], // Include email list
                board: populatedTicket.boardId, // Flatten board reference
            }
        });

    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ 
            message: "Error creating ticket.",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

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



// Get all tickets that are assigned to user
const getMyTickets = async (req, res) => {
    try {
        const userId = req.user._id;

        const tickets = await Ticket.find({ assignedTo: userId })
            .populate("boardId", "name") // Optional: includes board name
            .select("-__v"); // Optional: excludes Mongoose internal field

        if (!tickets.length) {
            return res.status(404).send("No tickets assigned to this user.");
        }

        res.status(200).json(tickets);
    } catch (err) {
        console.error("Error fetching assigned tickets:", err);
        res.status(500).send("Error fetching tickets.");
    }
};

// Gets tickets assigned to user from specified board
const getMyTicketsForBoard = async (req, res) => {
    const userId = req.user._id;  // Assuming the user is authenticated and we have access to their ID
    const { boardId } = req.params;  // Get the boardId from the route parameter

    try {
        // Fetch tickets assigned to the user and specific to the given board
        const tickets = await Ticket.find({
            assignedTo: userId,  // Only fetch tickets assigned to the logged-in user
            boardId: boardId  // Only fetch tickets for the specific board
        }).populate("boardId", "name")  // Optional: include board name
            .select("-__v");  // Optional: exclude Mongoose internal field

        if (!tickets.length) {
            return res.status(404).json({ message: "No tickets assigned to you for this board." });
        }

        res.status(200).json(tickets);
    } catch (err) {
        console.error("Error fetching tickets for user in board:", err);
        res.status(500).json({ message: "Error fetching tickets for the user in the board." });
    }
};


// update ticket
const updateTicket = async (req, res) => {
    try {

        console.log('Update ticket request:', {
            params: req.params,
            body: req.body
        });

        const { ticketId } = req.params;
        const updates = req.body;

        // Validate ticket ID
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({ error: "Invalid ticket ID" });
        }

        // Find and validate ticket
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        // Find and validate board
        const board = await Board.findById(ticket.boardId);
        if (!board) {
            return res.status(404).json({ error: "Board not found" });
        }

        // Handle assigned users update
        if (updates.assignedToEmails?.length > 0) {

            console.log('Processing assigned emails:', updates.assignedToEmails);
            const assignedUsers = await User.find({ 
                email: { $in: updates.assignedToEmails } 
            });

            console.log('Found users:', assignedUsers.map(u => u.email));

            // Validate all users exist
            if (assignedUsers.length !== updates.assignedToEmails.length) {
                const foundEmails = assignedUsers.map(u => u.email);
                const missingEmails = updates.assignedToEmails.filter(
                    email => !foundEmails.includes(email)
                );
                return res.status(400).json({ 
                    error: "Some users not found",
                    missingEmails
                });
            }

            // Validate board membership
            const invalidUsers = assignedUsers.filter(user =>
                !board.members.includes(user._id) && !board.owner.equals(user._id)
            );
            
            if (invalidUsers.length > 0) {
                return res.status(403).json({
                    error: "Users not in board",
                    invalidUsers: invalidUsers.map(u => u.email)
                });
            }

            updates.assignedTo = assignedUsers.map(user => user._id);
            console.log('Final assignedTo IDs:', updates.assignedTo);
        }

        // Handle status change
        const oldStatus = ticket.status;
        let statusChanged = false;

        if (updates.status && updates.status !== oldStatus) {
            // Normalize status values
            updates.status = updates.status === 'Completed' ? 'Done' : updates.status;
            statusChanged = true;

            // Initialize counter if undefined
            if (board.completedTicketCount === undefined) {
                board.completedTicketCount = 0;
            }

            // Update completion count
            if (updates.status === 'Done') {
                board.completedTicketCount += 1;
            } else if (oldStatus === 'Done') {
                board.completedTicketCount = Math.max(0, board.completedTicketCount - 1);
            }
        }

        // Apply updates
        Object.assign(ticket, updates);
        await ticket.save();

        // Save board if status changed
        if (statusChanged) {
            await board.save();
        }

        // Attempt notifications (but don't fail if this fails)
        try {
            if (updates.assignedTo || statusChanged) {
                await notifyAssignedUsers(
                    updates.assignedTo || ticket.assignedTo,
                    `Ticket updated: ${ticket.title}`,
                    statusChanged ? `Status changed to ${updates.status}` : null
                );
            }
        } catch (notifyError) {
            console.error("Notification failed:", notifyError);
            // Continue even if notifications fail
        }

        // Return populated ticket
        const updatedTicket = await Ticket.findById(ticket._id)
            .populate("assignedTo", "name email")
            .populate("boardId", "name");

        res.status(200).json({
            ...updatedTicket.toObject(),
            // Map status back to frontend convention
            status: updatedTicket.status === 'Done' ? 'Completed' : updatedTicket.status
        });

    } catch (error) {
        console.error("Error updating ticket:", {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({ 
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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

// Get ticket assigned name and email given the ticketId
const getTicketAssignees = async (req, res) => {
    try {
        const ticketId = req.params.ticketId;

        // 1. Find the ticket by ID and populate both name and email
        const ticket = await Ticket.findById(ticketId).populate("assignedTo", "name email");
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // 2. Extract the name and email of each assignee
        const assignees = ticket.assignedTo.map(assignee => ({
            name: assignee.name,
            email: assignee.email
        }));

        // 3. Return the list of assignees
        res.status(200).json({
            ticketId,
            assignees
        });

    } catch (error) {
        console.error("Error fetching assignees:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
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


// Add comment
const addComment = async (req, res) => {
    try {
        const ticketId = req.params.ticketId;
        const { userId, text } = req.body;
        const file = req.file;

        // 1. Find the ticket
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // 2. Get the board and check membership
        const board = await Board.findById(ticket.boardId);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        // 3. Check if the user is either a member or the owner of the board
        const isMember = board.members.includes(userId);
        const isOwner = board.owner.equals(userId);

        if (!isMember && !isOwner) {
            return res.status(403).json({ message: 'You must be a member or the owner of the board to comment' });
        }

        // 4. Create the comment
        const newComment = new Comment({
            ticketId,
            userId,
            text,
            attachment: file ? file.filename : null
        });

        await newComment.save();

        // 5. Get the list of users to notify (assigned users and board owner)
        const assignedUsers = ticket.assignedTo;
        const boardOwner = board.owner;

        // Create a list of users to notify (excluding the user who posted the comment)
        const usersToNotify = new Set([...assignedUsers, boardOwner]);

        usersToNotify.forEach(async (assignedUserId) => {
            if (!assignedUserId.equals(userId)) { // Avoid sending a notification to the commenter
                const notification = new Notifications({
                    userId: assignedUserId,
                    type: 'comment',
                    message: `A new comment has been added to the ticket: ${ticket.title}`,
                    referenceId: ticket._id,
                    read: false,
                });

                await notification.save();

                // Emit the notification to the user via socket.io
                if (io) io.to(assignedUserId.toString()).emit('new-notification', notification);
                console.log("Notification sent to user:", assignedUserId);
            }
        });

        res.status(201).json(newComment);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};





// get comments for a ticket
const getCommentsForTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const comments = await Comment.find({ ticketId })
            .populate('userId', 'username email') // populate user details if you want
            .sort({ createdAt: -1 }); // newest first

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete the comment (only owner can)
const deleteComment = async (req, res) => {
    try {
        const { ticketId, commentId } = req.params;

        // Find the comment
        const comment = await Comment.findOne({ _id: commentId, ticketId });

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        await Comment.deleteOne({ _id: commentId });

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

//AI for daily stendup generation
const generateDailyStandup = async (req, res) => {
    const userId = req.user._id;

    try {
        // Fetch the user's tickets using the existing getMyTickets function
        const tickets = await Ticket.find({ assignedTo: userId })
            .populate("boardId", "name")
            .select("-__v");

        if (!tickets.length) {
            return res.status(404).json({ message: "No tickets assigned to this user." });
        }

        // Prepare task information for the AI with formatted deadline
        const taskInfo = tickets.map((ticket) => {
            const deadline = ticket.deadline ? new Date(ticket.deadline) : null;
            const formattedDeadline = deadline ? deadline.toLocaleDateString("en-US") : "No due date";
            console.log(formattedDeadline);
            return {
                title: ticket.title,
                status: ticket.status,
                deadline: formattedDeadline,
            };
        });

        // AI prompt for generating standup
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You're an AI assistant helping with daily standups. Given a list of tasks, write a short and clear standup summary. The tone should be professional, but friendly—neither too formal nor too casual. Each task should be summarized with:
                    - A brief mention of the task.
                    - Its current status (e.g., "in progress," "to be done").
                    - The due date, if available (e.g., "no due date," "due tomorrow," or an exact date).
                    Keep the summary concise, easy to read, and engaging without being overly formal or too casual.`
                },
                {
                    role: "user",
                    content: `Here are the tasks: ${JSON.stringify(taskInfo)}`
                }
            ]
        });

        const aiText = aiResponse.choices[0]?.message?.content?.trim();

        res.status(200).json({
            message: "Daily standup generated successfully.",
            standup: aiText
        });

    } catch (err) {
        console.error("AI Standup Error:", err.response?.data || err.message, err.stack);
        res.status(500).json({ message: "Internal server error during AI standup generation." });
    }
};

const uploadPicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Correct path - use the actual path from req.file
        const filePath = `/profilePictures/${req.file.filename}`;

        // Update user
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profileImage: filePath },
            { new: true }
        );

        res.status(200).json({
            message: 'Profile picture uploaded successfully!',
            user,
            imageUrl: filePath // Return the relative URL
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            message: 'An unexpected error occurred.',
            error: err.message // Include error message
        });
    }
};




module.exports = {setSocketInstance, register, login,createBoard,
    myBoards,deleteBoard,createTicket,getTickets,deleteTicket,
board, updateBoard,getSingleTicket,getMyTickets, updateTicket,assignUserToTicket,
removeUserFromTicket,getUserProfile, updateUserProfile, deleteUser,
getNotifications,createNotification,markNotificationRead, deleteNotification,
generateTicketsFromPrompt, getUserBasicInfoById, addComment,
getCommentsForTicket,deleteComment,getTicketAssignees,generateDailyStandup,
getMyTicketsForBoard, uploadPicture};

