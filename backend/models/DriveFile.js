const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const driveFileSchema = new Schema({
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DriveFile', driveFileSchema);
