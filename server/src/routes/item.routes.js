const express = require('express');
const requireAuth = require('../middleware/auth');
const { listItems, listRuns } = require('../controllers/item.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/runs', listRuns);
router.get('/', listItems);

module.exports = router;
