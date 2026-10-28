// PriceProof: Wishlist Routes (Protected)
const express = require('express');
const router = express.Router();
const WishlistController = require('../controllers/wishlistController');
const { requireAuth } = require('../middleware/auth');
const { mutationLimiter } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.get('/', WishlistController.getWishlist);
router.post('/', mutationLimiter, WishlistController.addToWishlist);
router.delete('/:variantId', WishlistController.removeFromWishlist);

module.exports = router;
