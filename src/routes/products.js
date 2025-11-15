const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { authenticated, adminOnly } = require('../middlewares/auth');

router.post('/', authenticated, adminOnly, ctrl.create);
router.put('/:id', authenticated, adminOnly, ctrl.update);
router.delete('/:id', authenticated, adminOnly, ctrl.remove);
router.get('/', ctrl.list);

module.exports = router;
