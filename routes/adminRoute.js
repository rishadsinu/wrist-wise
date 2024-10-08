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
adminRoute.get('/filtered-orders', adminAuth, adminController.getFilteredOrders);
adminRoute.get('/quick-filtered-orders', adminAuth, adminController.getQuickFilteredOrders);
adminRoute.get('/download-report', adminAuth, adminController.downloadPDFReport);
adminRoute.post('/logout', adminController.adminLogout)

// product
adminRoute.get('/productlist',adminAuth,productController.loadProductlist);
adminRoute.get('/add-product',adminAuth,productController.loadAddproduct);
adminRoute.get('/product/:id', adminAuth, productController.getProductDetails);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../public/images')); 
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
      if (file.fieldname === 'productImages') { 
        cb(null, true);
      } else {
        cb(new Error('Unexpected field'));
      }
    }
  });
adminRoute.post('/submit-product', adminAuth, upload.array('productImages', 3), productController.addProduct);
// adminRoute.post('/update-product/:id', adminAuth, upload.array('productImages', 3), productController.updateProduct);

adminRoute.post('/update-product/:id', upload.array('productImages', 3), productController.updateProduct);

// user
adminRoute.get('/customers',adminAuth, adminController.loadCustomers);
adminRoute.post('/user/block/:userId', adminAuth, adminController.blockUser);
adminRoute.post('/user/unblock/:userId', adminAuth, adminController.unblockUser);

// category
adminRoute.get('/categorylist',adminAuth, categoryController.loadcategorylist);
adminRoute.post('/add-category', adminAuth, categoryController.addCategory);
adminRoute.post('/edit-category', adminAuth, categoryController.editCategory);

// order
adminRoute.get('/orderlist',adminAuth, orderController.loadOrdersList);
adminRoute.get('/orderdetails/:orderId', adminAuth, orderController.getOrderDetails);
adminRoute.put('/updateItemStatus/:orderId/:itemId', adminAuth, orderController.updateItemStatus);
adminRoute.post('/orders/:orderId/items/:itemId/accept-cancel', adminAuth, orderController.acceptCancellationRequest);
adminRoute.post('/orders/:orderId/items/:itemId/accept-return', adminAuth, orderController.acceptReturnRequest);
// offer
adminRoute.get('/offerslist', adminAuth, offerController.loadOffers);
adminRoute.post('/addoffer/add', adminAuth, offerController.addOffer);
adminRoute.delete('/addoffer/delete/:id',  adminAuth, offerController.deleteOffer);
adminRoute.get('/addoffer/get/:id', adminAuth, offerController.getOffer);
adminRoute.put('/addoffer/update', adminAuth, offerController.updateOffer);

// coupon
adminRoute.get('/couponlist', adminAuth, couponController.loadCoupon);
adminRoute.post('/add-coupon', adminAuth, couponController.addCoupon);
adminRoute.get('/get-coupon/:couponId', adminAuth, couponController.getCoupon);
adminRoute.put('/update-coupon/:couponId', adminAuth, couponController.updateCoupon);
adminRoute.delete('/delete-coupon/:couponId', adminAuth, couponController.deleteCoupon);

// 404
adminRoute.use((req, res) => {
  res.status(404).render('admin404');
});

module.exports = adminRoute;
