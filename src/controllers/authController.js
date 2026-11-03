const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendUserResponse = (res, user, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        token: generateToken(user._id.toString()),
    });
};

const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body || {};

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required',
            });
        }

        const normalizedName = name.trim();
        if (normalizedName.length < 2 || normalizedName.length > 80) {
            return res.status(400).json({
                success: false,
                message: 'Name must be between 2 and 80 characters',
            });
        }

        if (!emailPattern.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'guest',
        });

        return sendUserResponse(res, user, 201);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists',
            });
        }

        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        if (!emailPattern.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been disabled',
            });
        }

        return sendUserResponse(res, user);
    } catch (error) {
        next(error);
    }
};

const getCurrentUser = (req, res) => {
    return res.status(200).json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
        },
    });
};

module.exports = { register, login, getCurrentUser };
