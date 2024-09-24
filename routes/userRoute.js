
const express = require("express");
const userRoute = express()
const session = require("express-session");
const passport = require('passport');
require('../config/passportConfig');
const path = require('path');
const { isLoggedIn, preventLoginPageAccess } = require('../middleware/userAuth');

// controllers
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const categoryController = require('../controllers/user/categoryController');
const profileController = require('../controllers/user/profileController');
const orderController = require('../controllers/user/orderController');
const walletController = require('../controllers/user/walletController')

// Model
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Category = require('../models/categoryModel');


userRoute.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

userRoute.set("view engine", "ejs");
userRoute.set('views', './views/user')

userRoute.get('/', userController.loadHome);
userRoute.get('/home', userController.loadHome);
userRoute.post('/add-to-wishlist', userController.addToWishlist);
userRoute.get('/wishlist', userController.loadWishlist);
userRoute.post('/remove-from-wishlist', userController.removeFromWishlist);

userRoute.get('/category', categoryController.loadCategory);

// login  registration /  OTP  
userRoute.get('/registration', userController.loadRegister);
userRoute.post('/registration', userController.insertUser)
userRoute.get('/login', preventLoginPageAccess, userController.loadLogin);
userRoute.post('/login', preventLoginPageAccess, userController.verifylogin);
userRoute.post('/resend-otp', userController.resendOTP);
userRoute.post('/verify-otp', userController.verifyOTP);
userRoute.post('/logout', userController.userLogout)

userRoute.get('/forgotpassword', userController.loadForgotPassword);
userRoute.post('/forgot-password', userController.forgotPassword);
userRoute.get('/reset-password/:token', userController.loadResetPassword);
userRoute.post('/reset-password/:token', userController.resetPassword);

// Google OAuth routes
userRoute.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
userRoute.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  userController.googleLogin
);

//product
userRoute.get('/productlist', productController.loadProductlist);
userRoute.get('/productlist', productController.getProducts);
userRoute.get('/product/:id', productController.getProductDetails);
userRoute.get('/search',  productController.loadSearch);

// User Profile
userRoute.get('/userprofile', isLoggedIn, profileController.loadUserProfile);
userRoute.post('/update-profile', isLoggedIn, profileController.updateUserProfile);

userRoute.get('/change-password', isLoggedIn, profileController.loadChangePasswordPage);
userRoute.post('/change-password', isLoggedIn, profileController.changePassword);
userRoute.get('/profileAddress', isLoggedIn, profileController.loadProfileAddress)

userRoute.post('/add-address', isLoggedIn, profileController.addAddress);
userRoute.post('/update-address', isLoggedIn, profileController.updateAddress);
userRoute.delete('/delete-address/:id', isLoggedIn, profileController.deleteAddress);

userRoute.get('/profileOrders', isLoggedIn, profileController.loadProfileOrders)
userRoute.get('/user/order-details/:orderId', profileController.getOrderDetails);
userRoute.post('/user/cancel-item/:orderId/:itemId', profileController.requestCancellation);
userRoute.post('/user/return-item/:orderId/:itemId', profileController.requestReturn);

// cart // order 
userRoute.get('/cart', isLoggedIn, productController.loadCart);
userRoute.post('/add-to-cart', productController.addToCart);
userRoute.post('/remove-from-cart', productController.removeFromCart);
userRoute.post('/update-cart', productController.updateCart);
userRoute.post('/add-address', orderController.addAddress)
userRoute.post('/placeOrder', orderController.placeOrder);
userRoute.get('/orderPlaced', orderController.getOrderPlaced);
userRoute.get('/checkout', isLoggedIn, orderController.loadCheckout);
userRoute.post('/create-razorpay-order', isLoggedIn, orderController.createRazorpayOrder);
userRoute.get('/download-invoice/:orderId', orderController.generateInvoicePDF);


//coupon
userRoute.get('/user/active-coupons', orderController.getActiveCoupons);
userRoute.post('/user/apply-coupon', orderController.applyCoupon);


//wallet
userRoute.get('/wallet',walletController.loadWallet)


// userRoute.use((req, res) => {
//   res.status(404).send('404 - Page Not Found');
// });

module.exports = userRoute