const express = require('express');

const {
    getReservationPayment,
    recordPayment,
} = require('../controllers/paymentController');

const { protect } = require('../middleware/authMiddleware');

const { authorizationRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorizationRoles('admin', 'receptionist'));

router.get('/:reservationId', getReservationPayment);
router.post('/', recordPayment);

module.exports = router;