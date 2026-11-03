const express = require('express');

const {
    createRoom,
    getRooms,
    updateRoom,
    deactivateRoom,
    activateRoom,
    updateHouseKeepingStatus,
} = require('../controllers/roomController');

const {protect} = require('../middleware/authMiddleware');

const {authorizationRoles} = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/',getRooms);

router.post('/',protect,authorizationRoles('admin','receptionist'),createRoom);

router.patch('/:id',protect,authorizationRoles('admin','receptionist'),updateRoom);

router.patch('/:id/deactivate',protect,authorizationRoles('admin','receptionist'),deactivateRoom);

router.patch('/:id/activate',protect,authorizationRoles('admin','receptionist'),activateRoom);

router.patch('/:id/houseKeeping',protect,authorizationRoles('admin','receptionist'),updateHouseKeepingStatus)

module.exports = router;