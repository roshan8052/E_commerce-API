const router = require('express').Router();
const ctrl = require('../controllers/ordersController');
const { authenticated } = require('../middlewares/auth');

router.post('/checkout', authenticated, ctrl.checkout);
router.post('/:id/pay', authenticated, ctrl.pay);
router.get('/', authenticated, ctrl.list);
router.get('/:id', authenticated, ctrl.get);

module.exports = router;
