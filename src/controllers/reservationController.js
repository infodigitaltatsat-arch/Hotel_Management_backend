const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const Room = require('../models/Room');
const Reservation = require('../models/Reservation');

const RatePlan = require('../models/RatePlan')

const WEEKEND_DAYS = [5, 6];

const calculateRoomTotal = (room, checkIn, checkOut, ratePlans) => {
    let roomTotal = 0;

    for (let night = new Date(checkIn); night < checkOut; night.setUTCDate(night.getUTCDate() + 1)) {
        const matchingPlans = ratePlans.filter((plan) =>
            plan.roomType === room.roomType &&
            plan.isActive === true &&
            plan.startDate <= night &&
            plan.endDate >= night
        );

        if (matchingPlans.length > 1) {
            const planNames = matchingPlans.map((plan) => plan.name).join(', ');
            const date = night.toISOString().slice(0, 10);
            const error = new Error(
                `Overlapping active rate plans for room type "${room.roomType}" on ${date}: ${planNames}`,
            );
            error.code = 'AMBIGUOUS_RATE_PLAN';
            throw error;
        }

        const isWeekend = WEEKEND_DAYS.includes(night.getUTCDay());
        const seasonalPlan = matchingPlans[0];
        const nightlyRate = seasonalPlan
            ? isWeekend
                ? seasonalPlan.weekendRate
                : seasonalPlan.weekdayRate
            : isWeekend
                ? room.weekendRate ?? room.pricePerNight
                : room.weekdayRate ?? room.pricePerNight;

        roomTotal += nightlyRate;
    }

    return roomTotal;
};

// converting YYYY-MM-DD into a consistent UTC date.

const parseDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value) {
        return null;
    }
    return date;
};

// Find booking that overlap the requested stay

const findConflictingReservation = (roomId, checkIn, checkOut) => {
    return Reservation.findOne({
        room: roomId,
        $or: [
            { bookingStatus: { $in: ['confirmed', 'checked_in'] } },
            { bookingStatus: { $exists: false } },
        ],
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
    })
};

const getAvailableRooms = async (req, res, next) => {
    try {
        const checkIn = parseDate(req.query.checkIn);
        const checkOut = parseDate(req.query.checkOut);
        const guests = Number(req.query.guests);

        if (!checkIn || !checkOut || checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: 'Provide valid checkIn and checkOut dates. Check-out must be after check-in.'
            })
        }

        if (!Number.isInteger(guests) || guests < 1) {
            return res.status(400).json({
                success: false,
                message: 'Number of guests must be a positive number'
            })
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (checkIn < today) {
            return res.status(400).json({
                success: false,
                message: 'Check-in date cannot be in past',
            })
        }

        const rooms = await Room.find({
            isActive: true,
            status: 'available',
            $or:[
                {houseKeepingStatus : {$in:['clean','inspected']}},
                {houseKeepingStatus : {$exists: false}}
            ]
        }).sort({ roomNumber: 1 });

        const availableRooms = [];

        for (const room of rooms) {
            const conflict = await findConflictingReservation(
                room._id,
                checkIn,
                checkOut,
            );

            if (!conflict && room.capacity >= guests) {
                const ratePlans = await RatePlan.find({
                    roomType: room.roomType,
                    isActive: true,
                    startDate: { $lt: checkOut },
                    endDate: { $gte: checkIn },
                });

                availableRooms.push({
                    ...room.toObject(),
                    totalPrice: calculateRoomTotal(room, checkIn, checkOut, ratePlans),
                });
            }
        }

        return res.status(200).json({
            success: true,
            count: availableRooms.length,
            data: availableRooms,
        })
    } catch (error) {
        next(error)
    }
};

const getReservationQuote = async (req, res, next) => {
    try {
        const { roomId } = req.query;
        const checkIn = parseDate(req.query.checkIn);
        const checkOut = parseDate(req.query.checkOut);

        if (!mongoose.isValidObjectId(roomId) || !checkIn || !checkOut || checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: 'Provide a valid roomId, checkIn, and checkOut. Check-out must be after check-in.',
            });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        const ratePlans = await RatePlan.find({
            roomType: room.roomType,
            isActive: true,
            startDate: { $lt: checkOut },
            endDate: { $gte: checkIn },
        });

        return res.status(200).json({
            success: true,
            data: { totalPrice: calculateRoomTotal(room, checkIn, checkOut, ratePlans) },
        });
    } catch (error) {
        if (error.code === 'AMBIGUOUS_RATE_PLAN') {
            return res.status(409).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const createReservation = async (req, res, next) => {
    try {
        const {
            roomId,
            checkIn: checkInInput,
            checkOut: checkOutInput,
            numberOfGuests,
        } = req.body || {};

        if (!roomId || !checkInInput || !checkOutInput || numberOfGuests === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Room, check-in, check-out and guests count are required',
            })
        }

        if (!mongoose.isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room ID',
            })
        }

        const checkIn = parseDate(checkInInput);
        const checkOut = parseDate(checkOutInput);
        const guests = Number(numberOfGuests);

        if (!checkIn || !checkOut || checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: 'Provide valid checkIn and checkOut dates. Check-out must be after check-in.'
            })
        }

        if (!Number.isInteger(guests) || guests < 1) {
            return res.status(400).json({
                success: false,
                message: 'Number of guests must be a positive number'
            })
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (checkIn < today) {
            return res.status(400).json({
                success: false,
                message: 'Check-in date cannot be in past',
            })
        }

        let roomUnavailable = false;
        let bookingConflict = false;
        let ratePlanConflict;
        let reservation;
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                roomUnavailable = false;
                bookingConflict = false;
                ratePlanConflict = undefined;
                reservation = undefined;

                const room = await Room.findOne({
                    _id: roomId,
                    isActive: true,
                    status: 'available',
                    $or: [
                        { houseKeepingStatus: { $in: ['clean', 'inspected'] } },
                        { houseKeepingStatus: { $exists: false } },
                    ],
                }).session(session);

                if (!room) {
                    roomUnavailable = true;
                    return;
                }

                const ratePlans = await RatePlan.find({
                    roomType: room.roomType,
                    isActive: true,
                    startDate: { $lt: checkOut },
                    endDate: { $gte: checkIn },
                }).session(session);

                let totalPrice;
                try {
                    totalPrice = calculateRoomTotal(room, checkIn, checkOut, ratePlans);
                } catch (error) {
                    if (error.code !== 'AMBIGUOUS_RATE_PLAN') {
                        throw error;
                    }

                    ratePlanConflict = error.message;
                    return;
                }

                const roomLock = await Room.updateOne(
                    {
                        _id: roomId,
                        isActive: true,
                        status: 'available',
                        $or: [
                            { houseKeepingStatus: { $in: ['clean', 'inspected'] } },
                            { houseKeepingStatus: { $exists: false } },
                        ],
                    },
                    { $inc: { bookingVersion: 1 } },
                    { session },
                );

                if (roomLock.modifiedCount !== 1) {
                    roomUnavailable = true;
                    return;
                }

                const conflict = await findConflictingReservation(
                    room._id,
                    checkIn,
                    checkOut,
                ).session(session);

                if (conflict) {
                    bookingConflict = true;
                    return;
                }

                [reservation] = await Reservation.create([{
                    bookingReference: `HTL-${randomUUID().slice(0, 8).toUpperCase()}`,
                    room: room._id,
                    guest: req.user._id,
                    checkIn,
                    checkOut,
                    numberOfGuests: guests,
                    totalPrice,
                }], { session });
            });
        } finally {
            await session.endSession();
        }

        if (ratePlanConflict) {
            return res.status(409).json({
                success: false,
                message: ratePlanConflict,
            });
        }

        if (roomUnavailable) {
            return res.status(404).json({
                success: false,
                message: 'Room not found or unavailable for use',
            });
        }

        if (bookingConflict) {
            return res.status(409).json({
                success: false,
                message: 'Room is already booked for some or all of the dates',
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            data: reservation,
        });
    }
    catch (error) {
        next(error);
    }
};


const getMyReservations = async (req, res, next) => {
    try {

        const reservations = await Reservation.find({
            guest: req.user._id,
        }).populate('room', 'roomNumber roomType floor pricePerNight').sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations,
        })




    } catch (error) {
        next(error)
    }
}




const getReservationById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation ID,'
            })
        }

        const reservation = await Reservation.findOne({
            _id: req.params.id,
            guest: req.user._id,

        }).populate('room', 'roomNumber roomType floor pricePerNight');

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found',
            })
        }
        return res.status(200).json({
            success: true,
            reservation,
        })
    } catch (error) {
        next(error)
    }
}


const cancelReservation = async (req, res, next) => {
    try {

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation ID'
            })
        }

        const reservation = await Reservation.findOne({
            _id: req.params.id,
            guest: req.user._id,
        });

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        if (reservation.bookingStatus !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Only confirmed reservations can be cancelled'
            })
        }

        reservation.bookingStatus = 'cancelled';
        await reservation.save();

        return res.status(200).json({
            success: true,
            message: 'Reservation cancelled successfully',
            data: reservation,
        })

    } catch (error) {
        next(error);
    }
};

// This is for Admin :- 

const getAllReservation = async (req, res, next) => {
    try {

        const { status, checkIn, checkOut } = req.query;
        const filter = {};

        if (status) {
            const allowedStatuses = [
                'confirmed',
                'checked_in',
                'checked_out',
                'cancelled',
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid booking status'
                });
            }

            filter.bookingStatus = status;
        }

        if (checkIn || checkOut) {
            const startDate = checkIn ? parseDate(checkIn) : null;
            const endDate = checkOut ? parseDate(checkOut) : null;

            if ((checkIn && !startDate) ||
                (checkOut && !endDate) ||
                (startDate && endDate && startDate >= endDate)) {
                return res.status(400).json({
                    success: false,
                    message: 'Provide valid checkIn and checkOut dates. Check-out must be after check-in.',
                })
            }

            if (startDate && endDate) {
                filter.checkIn = { $lt: endDate };
                filter.checkOut = { $gt: startDate };
            } else if (startDate) {
                filter.checkOut = { $gt: startDate };
            } else {
                filter.checkIn = { $lt: endDate };
            }


        }

        const reservations = await Reservation.find(filter)
            .populate('room', 'roomNumber roomType floor')
            .populate('guest', 'name email')
            .sort({ checkIn: 1 });
        return res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations,
        });

    } catch (error) {
        next(error);
    }
};

const getStaffReservationById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation ID',
            })
        }

        const reservation = await Reservation.findById(req.params.id).populate('room', 'roomNumber roomType floor').populate('guest', 'name email');

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }
        return res.status(200).json({
            success: true,
            data: reservation,
        })
    } catch (error) {
        next(error)
    }
}

const checkInGuest = async (req, res, next) => {
    try {
        if (!
            mongoose.isValidObjectId(req.params.id)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation ID'
            })
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        if (reservation.bookingStatus !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Only conformed reservation can be checked in'
            })
        }

        const now = new Date();
        const today = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getMonth(),
            now.getUTCDate(),
        ));

        if (reservation.checkIn > today) {
            return res.status(400).json({
                success: false,
                message: 'Guest can not check in before the check-in date'
            })
        }

        reservation.bookingStatus = 'checked_in';
        await reservation.save();

        return res.status(200).json({
            success: true,
            message: 'Guest checked-in successfully',
            data: reservation,
        })
    } catch (error) {
        next(error)
    }
}

const checkOutGuest = async (req, res, next) => {
    try {

        if (!
            mongoose.isValidObjectId(req.params.id)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation ID'
            })
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        if (reservation.bookingStatus !== 'checked_in') {
            return res.status(400).json({
                success: false,
                message: 'Only checked-in guests can check out'
            })
        }

        reservation.bookingStatus = 'checked_out';
        await reservation.save();

        return res.status(200).json({
            success: true,
            message: 'Guest checked-in successfully',
            data: reservation,
        })

    } catch (error) {
        next(error)
    }
}




module.exports = {
    getAvailableRooms,
    getReservationQuote,
    createReservation,
    getMyReservations,
    getReservationById,
    cancelReservation,
    getAllReservation,
    getStaffReservationById,
    checkInGuest,
    checkOutGuest,
    calculateRoomTotal,
};
