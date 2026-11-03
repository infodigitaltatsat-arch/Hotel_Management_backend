const express = require('express');

const {
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
} = require('../controllers/reservationController');

const { protect } = require('../middleware/authMiddleware');
const { authorizationRoles } = require('../middleware/roleMiddleware')

const router = express.Router();

router.get('/availability', getAvailableRooms);
router.get('/quote', getReservationQuote);

router.get('/staff/all',protect,authorizationRoles('admin','receptionist'),getAllReservation);

router.get('/staff/:id',protect,authorizationRoles('admin','receptionist'),getStaffReservationById);

router.patch('/staff/:id/check-in',protect,authorizationRoles('admin','receptionist'),checkInGuest)

router.patch('/staff/:id/check-out',protect,authorizationRoles('admin','receptionist'),checkOutGuest)




router.post('/', protect, createReservation);
router.get('/my', protect, getMyReservations);
router.get('/:id', protect, getReservationById);
router.patch('/:id/cancel', protect, cancelReservation);

module.exports = router;
