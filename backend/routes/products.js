// PriceProof: Product Routes
const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');

// Catalog metadata
router.get('/categories', ProductController.getCategories);
router.get('/brands', ProductController.getBrands);
router.get('/stores', ProductController.getStores);

// Highlights & Products
router.get('/featured/price-drops', ProductController.getPriceDrops);
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

module.exports = router;
