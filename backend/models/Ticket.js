const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    status: {
        type: String,
        enum: ["To Do", "In Progress", "Done"],
        default: "To Do"
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Board",
        required: true
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },
    deadline: Date,
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        message: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);
