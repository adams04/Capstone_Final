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
        const { name, ownerEmail, memberEmails } = req.body;

        // Check if owner exists
        const owner = await User.findOne({ email: ownerEmail });
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
        const userEmail = req.params.email;

        const user = await User.findOne({ email: userEmail });

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



module.exports = { register, login,createBoard, myBoards,createTicket,getTickets };

