const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const boardSchema = new Schema({
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    tickets: [{ type: Schema.Types.ObjectId, ref: 'Ticket' }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Board', boardSchema);
