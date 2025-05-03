const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    passwordHash: {
        type: String,
        required: function () {
            return !this._password;
        }
    },
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

// 🔐 Virtual password field
userSchema.virtual('password')
    .set(function(password) {
        this._password = password;
    });

// 🔐 Pre-save hook for hashing password
userSchema.pre('save', async function(next) {
    if (!this._password) return next(); // Only hash if virtual password is set

    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this._password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

//  Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!candidatePassword || !this.passwordHash) {
        throw new Error('Missing password or hash');
    }
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
