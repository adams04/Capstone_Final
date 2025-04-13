const User = require('../models/User');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        console.log('[DEBUG] Received registration data:', req.body); // Add this
        
        const { name, surname, email, passwordHash, dateOfBirth } = req.body;
        
        console.log('[DEBUG] Checking for existing user:', email); // Add this
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            console.log('[DEBUG] User already exists:', existingUser); // Add this
            return res.status(400).json({ error: 'Email already in use' });
        }

        console.log('[DEBUG] Creating new user...'); // Add this
        const user = new User({
            name,
            surname,
            email,
            passwordHash,
            dateOfBirth,
            settings: { theme: 'light' }
        });

        await user.save();
        console.log('[DEBUG] User saved to DB:', user); // Add this

        // ... rest of your code ...
    } catch (error) {
        console.error('[ERROR] Registration failed:', error); // Enhanced error log
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, passwordHash } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password using the model method
        const isMatch = await user.comparePassword(passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
};

module.exports = { register, login };