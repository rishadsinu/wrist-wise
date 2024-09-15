const express = require('express');
adminRoute = express(); 
const path = require('path');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const fs = require('fs');

adminRoute.set("view engine","ejs");
adminRoute.set('views','./views/admin');

// controllers
const adminController = require('../controllers/admin/adminController');
const productController = require('../controllers/admin/productController');
const categoryController = require('../controllers/admin/categoryController');
const orderController = require('../controllers/admin/orderController');
const offerController = require('../controllers/admin/offerController')
const couponController = require('../controllers/admin/couponController')

// model
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');

// login
adminRoute.get('/',adminController.loadLogin);
adminRoute.post('/adminlogin', adminController.loginAdmin);
adminRoute.get('/dashboard', adminAuth, adminController.loadDashboard);

// product
adminRoute.get('/productlist',adminAuth,productController.loadProductlist);
adminRoute.get('/add-product',adminAuth,productController.loadAddproduct);
adminRoute.get('/product/:id', adminAuth, productController.getProductDetails);

const uploadDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
//  Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
adminRoute.post('/submit-product', adminAuth, upload.array('productImages', 3), productController.addProduct);
adminRoute.post('/update-product/:id', adminAuth, upload.array('productImages', 3), productController.updateProduct);

// user
adminRoute.get('/customers',adminController.loadCustomers);
adminRoute.post('/user/block/:userId', adminController.blockUser);
adminRoute.post('/user/unblock/:userId', adminController.unblockUser);

// category
adminRoute.get('/categorylist',categoryController.loadcategorylist);
adminRoute.post('/add-category', categoryController.addCategory);
adminRoute.post('/edit-category', categoryController.editCategory);

// order
adminRoute.get('/orderlist',orderController.loadOrdersList);
adminRoute.get('/orderdetails/:orderId', orderController.getOrderDetails);
adminRoute.put('/updateItemStatus/:orderId/:itemId', orderController.updateItemStatus);
adminRoute.post('/orders/:orderId/items/:itemId/accept-cancel', orderController.acceptCancellationRequest);

// offer
adminRoute.get('/offerslist', offerController.loadOffers);
adminRoute.post('/addoffer/add', offerController.addOffer);
adminRoute.delete('/addoffer/delete/:id',  offerController.deleteOffer);
adminRoute.get('/addoffer/get/:id', offerController.getOffer);
adminRoute.put('/addoffer/update', offerController.updateOffer);

// coupon
adminRoute.get('/couponlist', couponController.loadCoupon)
adminRoute.post('/add-coupon', couponController.addCoupon);
adminRoute.get('/get-coupon/:couponId', couponController.getCoupon);
adminRoute.put('/update-coupon/:couponId', couponController.updateCoupon);
adminRoute.delete('/delete-coupon/:couponId', couponController.deleteCoupon);

module.exports = adminRoute;