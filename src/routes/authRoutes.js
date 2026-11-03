const express = require('express');

const {
    register,
    login,
    getCurrentUser,
} = require('../controllers/authController.js');

const {protect} = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/me',protect,getCurrentUser);

module.exports = router;