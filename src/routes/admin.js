const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticated, adminOnly } = require('../middlewares/auth');

router.get('/orders', authenticated, adminOnly, ctrl.listOrders);
router.patch('/orders/:id/status', authenticated, adminOnly, ctrl.updateStatus);

module.exports = router;
