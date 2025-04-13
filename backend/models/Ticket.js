const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    deadline: { type: Date },
    color: { type: String },
    voiceNotes: [{ type: Schema.Types.ObjectId, ref: 'VoiceNote' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    chatMessages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
    whiteboardId: { type: Schema.Types.ObjectId, ref: 'Whiteboard' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
