// PriceProof: Shopping List Routes (Protected)
const express = require('express');
const router = express.Router();
const ShoppingListController = require('../controllers/shoppingListController');
const { requireAuth } = require('../middleware/auth');
const { mutationLimiter } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.get('/', ShoppingListController.getShoppingLists);
router.post('/', mutationLimiter, ShoppingListController.createShoppingList);
router.get('/:id', ShoppingListController.getShoppingListById);
router.delete('/:id', ShoppingListController.deleteShoppingList);

// Items within list
router.post('/:id/items', mutationLimiter, ShoppingListController.addItemToList);
router.patch('/:id/items/:itemId', ShoppingListController.updateListItem);
router.delete('/:id/items/:itemId', ShoppingListController.removeItemFromList);

// Basket & Savings Estimate
router.get('/:id/estimate', ShoppingListController.getBasketEstimate);

module.exports = router;
