const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String, required: false }, // Changed to not required
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    profession: {
        type: String,
        enum: ['developer', 'designer', 'project-manager', 'qa-engineer', 'devops'],
        required: true
    },
    dateOfBirth: { type: Date },
    profileImage: { type: String },
    boards: [{ type: Schema.Types.ObjectId, ref: 'Board' }],
    settings: {
        theme: { type: String, default: 'light' },
        notifications: { type: Boolean, default: true }
    },
    calendarIntegration: {
        googleCalendarId: { type: String }
    }
}, { timestamps: true });

// Password hashing middleware
userSchema.pre('save', async function(next) {
    // Only hash if password is modified or new
    if (!this.isModified('passwordHash')) return next();
    
    try {
        // Hash the plain text password
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (err) {
        next(err);
    }
});
// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!candidatePassword || !this.passwordHash) {
      throw new Error('data and hash arguments required');
    }
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  };

module.exports = mongoose.model('User', userSchema);