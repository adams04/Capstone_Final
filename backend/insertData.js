require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Board = require("./models/Board");
const Ticket = require("./models/Ticket");
const Comment = require("./models/Comment");
const DriveFile = require("./models/DriveFile");

mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

const insertData = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await Board.deleteMany({});
        await Ticket.deleteMany({});
        await Comment.deleteMany({});
        await DriveFile.deleteMany({});

        // Create Users
        const user1 = new User({
            name: "John",
            surname: "Doe",
            email: "johndoe@example.com",
            passwordHash: "hashedpassword123",
            dateOfBirth: new Date("1995-06-15"),
            profileImage: "https://example.com/profile1.jpg",
            settings: { theme: "dark", notifications: true }
        });

        const user2 = new User({
            name: "Jane",
            surname: "Smith",
            email: "janesmith@example.com",
            passwordHash: "hashedpassword456",
            dateOfBirth: new Date("1998-09-21"),
            profileImage: "https://example.com/profile2.jpg",
            settings: { theme: "light", notifications: false }
        });

        await user1.save();
        await user2.save();

        // Create Board
        const board = new Board({
            name: "Project Management",
            owner: user1._id,
            members: [user1._id, user2._id]
        });

        await board.save();

        // Create Tickets
        const ticket1 = new Ticket({
            boardId: board._id,
            title: "Fix login issue",
            description: "Users are unable to log in due to a server error.",
            assignedTo: [user1._id],
            status: "In Progress",
            priority: "High",
            deadline: new Date("2025-03-01"),
            color: "#ff5733"
        });

        const ticket2 = new Ticket({
            boardId: board._id,
            title: "Design homepage UI",
            description: "Create a modern homepage design for the project.",
            assignedTo: [user2._id],
            status: "To Do",
            priority: "Medium",
            deadline: new Date("2025-04-01"),
            color: "#33ff57"
        });

        await ticket1.save();
        await ticket2.save();

        // Create Comments
        const comment1 = new Comment({
            ticketId: ticket1._id,
            userId: user2._id,
            text: "I think we need to debug the auth middleware."
        });

        const comment2 = new Comment({
            ticketId: ticket2._id,
            userId: user1._id,
            text: "Let's use Figma for the initial design mockups."
        });

        await comment1.save();
        await comment2.save();

        // Create Drive File
        const driveFile = new DriveFile({
            boardId: board._id,
            ticketId: ticket1._id,
            uploadedBy: user1._id,
            fileUrl: "https://example.com/doc1.pdf",
            fileType: "pdf"
        });

        await driveFile.save();

        console.log("Sample data inserted successfully!");
        mongoose.connection.close();
    } catch (error) {
        console.error("Error inserting data:", error);
        mongoose.connection.close();
    }
};

insertData();
