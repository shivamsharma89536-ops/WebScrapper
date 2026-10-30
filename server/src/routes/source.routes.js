const express = require('express');
const requireAuth = require('../middleware/auth');
const { scrapeSourceNow } = require('../controllers/item.controller');
const {
  testSelector,
  listSources,
  createSource,
  getSource,
  updateSource,
  deleteSource,
} = require('../controllers/source.controller');

const router = express.Router();

router.use(requireAuth);
router.post('/test-selector', testSelector);
router.post('/:id/scrape', scrapeSourceNow);
router.get('/', listSources);
router.post('/', createSource);
router.get('/:id', getSource);
router.put('/:id', updateSource);
router.delete('/:id', deleteSource);

module.exports = router;
