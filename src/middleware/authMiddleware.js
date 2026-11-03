const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerMatch = authHeader?.match(/^Bearer\s+(\S+)$/i);

    if (!bearerMatch) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }

    if (!process.env.JWT_SECRET) {
        return next(new Error('JWT_SECRET is not configured'));
    }

    let decoded;
    try {
        decoded = jwt.verify(bearerMatch[1], process.env.JWT_SECRET);
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
        }

        return next(error);
    }

    if (typeof decoded === 'string' || typeof decoded.userId !== 'string') {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }

    try {
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User is unavailable',
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = {protect};