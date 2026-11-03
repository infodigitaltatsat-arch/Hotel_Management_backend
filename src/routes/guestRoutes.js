const express = require('express');

const {getGuestRecords} = require('../controllers/guestController');
const {protect} = require('../middleware/authMiddleware');
const {authorizationRoles} = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/',protect,authorizationRoles('admin','receptionist'),getGuestRecords);

module.exports = router;


