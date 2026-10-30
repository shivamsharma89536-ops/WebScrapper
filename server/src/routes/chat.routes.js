const express = require('express');
const requireAuth = require('../middleware/auth');
const { chat } = require('../controllers/chat.controller');

const router = express.Router();

router.use(requireAuth);
router.post('/', chat);

module.exports = router;
