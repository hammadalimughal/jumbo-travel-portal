const express = require('express');
const router = express.Router();

router.use('/auth', require('./authentication'));
router.use('/hotel', require('./hotel'));
router.use('/quotation', require('./quotation'));

module.exports = router;