const express = require('express');
const router  = express.Router();
const mc = require('../controllers/mpesa.controller');
const { authenticate, schoolScope, staffOnly } = require('../middleware/auth');
router.post('/stk-push', authenticate, schoolScope, staffOnly, mc.initiateStkPush);
router.post('/callback', mc.handleStkCallback || ((_req, res) => res.json({ ResultCode: 0 })));
router.post('/c2b',      mc.handleC2BCallback  || ((_req, res) => res.json({ ResultCode: 0 })));
module.exports = router;
