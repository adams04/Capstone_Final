const express = require('express')
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const collection = require("./config");

const app = express()

//convert into JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.use(express.static(path.join(__dirname, "..", "public")));


app.get('/', (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
})

// Sign up
app.post("/signup", async (req, res) => {
    const data = {
        email: req.body.email,
        password: req.body.password,
    }
    // check if user already exists
    const existingUser = await collection.findOne({email: data.email});
    if (existingUser) {
        res.send("User with this email already exists!");
    }else {
        //hashing password
        const saltRounds = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, saltRounds);

        const userdata = await collection.insertMany(data);
        console.log(userdata);
    }
})

//Sign in
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ email: req.body.email });
        if (!check) {
            return res.send("Email not found!");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            return res.send("Wrong password!");
        }

        res.render("home");
    } catch (error) {
        console.error(error);
        res.send("Something went wrong. Please try again.");
    }
});

app.post("/createboard", async (req, res) => {
    try {
        const { name, ownerEmail, memberEmails } = req.body;

        // Check if owner exists
        const owner = await User.findOne({ email: ownerEmail });
        if (!owner) {
            return res.status(400).send("Owner not found.");
        }

        // 🔍 Check for duplicate board name for the same owner
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
});


// Get board
app.get("/myboards", async (req, res) => {
    try {
        const userEmail = req.query.email;

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
});


// Create ticket
app.post("/createticket", async (req, res) => {
    try {
        const { title, description, status, assignedToEmails, boardId, priority, deadline } = req.body;

        // Check if board exists
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).send("Board not found.");
        }

        // Validate assigned users
        let assignedUserIds = [];
        if (assignedToEmails && assignedToEmails.length > 0) {
            const assignedUsers = await User.find({ email: { $in: assignedToEmails } });

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
});


// Get tickets of the board

app.get("/boardtickets/:boardId", async (req, res) => {
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
});

const port = 5000
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})