const mongoose = require('mongoose');

const Payment = require('../models/Payment');

const Reservation = require('../models/Reservation');

const getReservationPayment = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation ID'
            })
        }

        const reservation = await Reservation.findById(req.params.reservationId);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        const payments = await Payment.find({
            reservation: reservation._id,
        }).populate('receivedBy', 'name email').sort({ createdAt: -1 });

        const totalPaidCents = payments.reduce(
            (total, payment) => total + Math.round(payment.amount * 100),
            0,
        );
        const totalPaid = totalPaidCents / 100;
        const balance = Math.max(
            0,
            Math.round(reservation.totalPrice * 100) - totalPaidCents,
        ) / 100;

        return res.status(200).json({
            success: true,
            data: {
                reservationId: reservation._id,
                totalPrice: reservation.totalPrice,
                totalPaid,
                balance,
                payments,
            },
        })
    } catch (error) {
        next(error);
    }
}

const recordPayment = async (req, res, next) => {
    try {

        const { reservationId, amount, method, type, note } = req.body || {};
        if (!mongoose.isValidObjectId(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid reservationId is required'
            })
        }

        if (amount === undefined ||
            typeof amount !== 'number' ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            })
        }

        const allowedMethods = [
            'cash',
            'upi',
            'card',
            'bank_transfer',
            'other',
        ];

        if (!allowedMethods.includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            })
        }

        if (type && !['deposit', 'payment']) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment type'
            })
        }

        const amountCents = Math.round(amount * 100);
        if (Math.abs(amount * 100 - amountCents) > 1e-8) {
            return res.status(400).json({
                success: false,
                message: 'Amount can have no more than two decimal places',
            });
        }

        let result;
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                result = undefined;

                const reservation = await Reservation.findById(reservationId).session(session);

                if (!reservation) {
                    result = { status: 404, message: 'Reservation not found' };
                    return;
                }

                if (reservation.bookingStatus === 'cancelled') {
                    result = {
                        status: 400,
                        message: 'Cannot record payment for a cancelled reservation',
                    };
                    return;
                }

                const existingPayments = await Payment.find({
                    reservation: reservation._id,
                }).session(session);
                const totalPaidCents = existingPayments.reduce(
                    (total, existingPayment) => total + Math.round(existingPayment.amount * 100),
                    0,
                );
                const reservationTotalCents = Math.round(reservation.totalPrice * 100);
                const remainingCents = reservationTotalCents - totalPaidCents;

                if (amountCents > remainingCents) {
                    result = {
                        status: 400,
                        message: `Amount exceeds the remaining balance of ${Math.max(0, remainingCents / 100).toFixed(2)}`,
                    };
                    return;
                }

                const [payment] = await Payment.create([{
                    reservation: reservation._id,
                    amount: amountCents / 100,
                    method,
                    type: type || 'payment',
                    note: note || '',
                    receivedBy: req.user._id,
                }], { session });

                const updatedTotalCents = totalPaidCents + amountCents;
                reservation.paymentStatus = updatedTotalCents >= reservationTotalCents
                    ? 'paid'
                    : 'partially_paid';

                await reservation.save({ session });

                result = {
                    status: 201,
                    message: 'Payment recorded successfully',
                    data: {
                        payment,
                        totalPaid: updatedTotalCents / 100,
                        balance: Math.max(0, reservationTotalCents - updatedTotalCents) / 100,
                        paymentStatus: reservation.paymentStatus,
                    },
                };
            });
        } finally {
            await session.endSession();
        }

        if (result.status !== 201) {
            return res.status(result.status).json({
                success: false,
                message: result.message,
            });
        }

        return res.status(201).json({
            success: true,
            message: result.message,
            data: result.data,
        });



    } catch (error) {
        next(error)
    }
}

module.exports = {
    getReservationPayment,
    recordPayment
};