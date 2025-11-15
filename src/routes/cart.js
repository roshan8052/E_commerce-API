const router = require('express').Router();
const ctrl = require('../controllers/cartController');
const { authenticated } = require('../middlewares/auth');

router.get('/', authenticated, ctrl.get);
router.post('/items', authenticated, ctrl.addOrUpdate);
router.delete('/items/:productId', authenticated, ctrl.removeItem);

module.exports = router;
