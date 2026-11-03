const mongoose = require('mongoose');

const getHealth = (req, res) => {
    const isDatabaseConnected = mongoose.connection.readyState === 1;

    return res.status(isDatabaseConnected ? 200 : 503).json({
        success: isDatabaseConnected,
        message: isDatabaseConnected
            ? 'Hotel API is running'
            : 'Database is unavailable',
        database: isDatabaseConnected ? 'connected' : 'disconnected',
    });
};

module.exports = { getHealth };