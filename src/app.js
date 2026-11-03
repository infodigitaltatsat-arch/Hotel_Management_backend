const express = require('express');

const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');

const authRoutes = require('./routes/authRoutes.js');

const roomRoutes = require('./routes/roomRoutes.js')

const reservationRoutes = require('./routes/reservationRoutes.js');

const paymentRoutes = require('./routes/paymentRoutes.js')

const guestRoutes = require('./routes/guestRoutes.js');

const ratePlanRoutes = require('./routes/ratePlanRoutes.js');

const {
    notFoundMiddleware,
    errorMiddleware,
} = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({
    origin:[
        process.env.CLIENT_URL,
        process.env.ADMIN_URL,
    ].filter(Boolean),
}));

app.use(express.json());

app.use('/api/health',healthRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/rooms',roomRoutes);
app.use('/api/reservation',reservationRoutes);

app.use('/api/rate-plans',ratePlanRoutes);

app.use('/api/payments',paymentRoutes);
app.use('/api/guests',guestRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;