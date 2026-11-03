const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    bookingReference: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
    },
    guest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
        validate: {
            validator(value) {
                return !this.checkIn || value > this.checkIn;
            },
            message: 'Check-out must be after check-in',
        },
    },
    numberOfGuests: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isInteger,
            message: 'Number of guests must be a whole number',
        },
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partially_paid', 'paid'],
        default: 'unpaid',
        required: true,

    },


    bookingStatus: {
        type: String,
        enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled'],
        default: 'confirmed',
        required: true,
    },

}, {
    timestamps: true,
},);

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;