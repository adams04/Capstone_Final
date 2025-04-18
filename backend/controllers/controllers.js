const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Board = require('../models/Board');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');



const register = async (req, res) => {
    try {
        const { name, surname, email, password, dateOfBirth } = req.body; // Changed from passwordHash to password
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const user = new User({
            name,
            surname,
            email,
            passwordHash: password, // Let mongoose middleware hash it
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
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
};

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

// Create board
const createBoard = async (req, res) => {
    try {
        const { name, memberEmails } = req.body;
        const owner = req.user;

        if (!owner) {
            return res.status(400).send("Owner not found.");
        }

        // Check for duplicate board name for the same owner
        const existingBoard = await Board.findOne({ name: name, owner: owner._id });
        if (existingBoard) {
            return res.status(400).send(`You already have a board named "${name}". Please choose a different name.`);
        }

        // Find all members by email
        const members = await User.find({ email: { $in: memberEmails } });

        if (members.length !== memberEmails.length) {
            return res.status(400).send("Some member emails were not found.");
        }

        // Create the board
        const board = new Board({
            name,
            owner: owner._id,
            members: members.map(m => m._id),
            tickets: []
        });

        await board.save();

        res.status(201).send(`Board "${name}" created successfully.`);
    } catch (error) {
        console.error(error);
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
    const { name, addMembers = [], removeMembers = [] } = req.body;

    try {
        const board = await Board.findOne({
            _id: req.params.boardId,
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        });

        if (!board) {
            return res.status(404).json({ message: 'Board not found or not authorized' });
        }

        if (name !== undefined) board.name = name;

        // Make sure all IDs are strings for comparison
        const currentMemberIds = board.members.map(m => m.toString());

        // Add members
        addMembers.forEach(memberId => {
            if (!currentMemberIds.includes(memberId)) {
                board.members.push(memberId); // It's fine to push a string; Mongoose will cast it
            }
        });

        // Remove members
        board.members = board.members.filter(
            member => !removeMembers.includes(member.toString())
        );

        await board.save();

        res.json(board);
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
            const assignedUsers = await User.find({email: {$in: assignedToEmails}});

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

        res.status(201).send(`Ticket "${title}" created successfully.`);
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

// delete ticket
const deleteTicket = async (req, res) => {
    console.log("DELETE ticket endpoint hit");
    try {
        const { ticketId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).send("Invalid ticket ID.");
        }

        const deleted = await Ticket.findByIdAndDelete(ticketId);

        if (!deleted) {
            return res.status(404).send("Ticket not found.");
        }

        res.status(200).send(`Ticket "${deleted.title}" deleted successfully.`);
    } catch (error) {
        console.error("Error deleting ticket:", error);
        res.status(500).send("Error deleting ticket.");
    }
};




module.exports = { register, login,createBoard,
    myBoards,deleteBoard,createTicket,getTickets,deleteTicket,
board, updateBoard};

