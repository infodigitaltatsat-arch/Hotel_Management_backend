const express = require('express');

const {
    createRatePlan,
    getRatePlans,
    deactivateRatePlan,
} = require('../controllers/ratePlanController');

const {protect} = require('../middleware/authMiddleware');

const {
    authorizationRoles
} = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/',protect,authorizationRoles('admin','receptionist'),getRatePlans);

router.post('/',protect,authorizationRoles('admin'),createRatePlan);

router.patch('/:id/deactivate',protect,authorizationRoles('admin'),deactivateRatePlan);

module.exports = router;