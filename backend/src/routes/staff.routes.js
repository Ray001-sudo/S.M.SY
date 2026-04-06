const express = require('express');
const router  = express.Router();
const sc = require('../controllers/staff.controller');
const { authenticate, authorise, schoolScope, staffOnly, selfOnly } = require('../middleware/auth');
router.use(authenticate, schoolScope, staffOnly);
router.get('/', authorise('admin','principal'), sc.getAll);
router.post('/', authorise('admin','principal'), sc.create);
router.put('/:id', selfOnly, sc.update);
module.exports = router;
