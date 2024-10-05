
const express = require("express");
const userRoute = express()
const session = require("express-session");
const passport = require('passport');
require('../config/passportConfig');
const path = require('path');
const { isLoggedIn, preventLoginPageAccess, checkUserBlocked } = require('../middleware/userAuth');

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
const User = require("../models/userModel");


userRoute.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

userRoute.set("view engine", "ejs");
userRoute.set('views', './views/user');

userRoute.get('/',  userController.loadHome);
userRoute.get('/home', checkUserBlocked, userController.loadHome);
userRoute.post('/add-to-wishlist',userController.addToWishlist);
userRoute.get('/wishlist', checkUserBlocked, userController.loadWishlist);
userRoute.post('/remove-from-wishlist', userController.removeFromWishlist);

userRoute.get('/category', checkUserBlocked,categoryController.loadCategory);

// login  registration /  OTP  
userRoute.get('/registration', preventLoginPageAccess, userController.loadRegister);
userRoute.post('/registration', preventLoginPageAccess, userController.insertUser)
userRoute.get('/login', preventLoginPageAccess, userController.loadLogin);
userRoute.post('/login', preventLoginPageAccess, userController.verifylogin);
userRoute.post('/resend-otp', userController.resendOTP);
userRoute.post('/verify-otp', userController.verifyOTP);
userRoute.post('/logout', userController.userLogout)

userRoute.post('/check-email', async (req, res) => {
  try {
      const existingUser = await User.findOne({ email: req.body.email });
      res.json({ exists: !!existingUser });
  } catch (error) {
      console.error('Error checking email:', error);
      res.status(500).json({ error: 'Server error' });
  }
});

userRoute.get('/forgotpassword', checkUserBlocked,userController.loadForgotPassword);
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
userRoute.get('/product/:id', checkUserBlocked, productController.getProductDetails);
userRoute.get('/search',  productController.loadSearch);

// User Profile
userRoute.get('/userprofile', isLoggedIn,checkUserBlocked, profileController.loadUserProfile);
userRoute.post('/update-profile', isLoggedIn, profileController.updateUserProfile);

userRoute.get('/change-password', isLoggedIn, profileController.loadChangePasswordPage);
userRoute.post('/change-password', isLoggedIn, profileController.changePassword);

userRoute.get('/profileAddress', isLoggedIn,checkUserBlocked, profileController.loadProfileAddress)
userRoute.post('/add-address', isLoggedIn, profileController.addAddress);
userRoute.post('/update-address', isLoggedIn, profileController.updateAddress);
userRoute.delete('/delete-address/:id', isLoggedIn, profileController.deleteAddress);

userRoute.get('/profileOrders', isLoggedIn,checkUserBlocked, profileController.loadProfileOrders)
userRoute.get('/user/order-details/:orderId', isLoggedIn, profileController.getOrderDetails);
userRoute.post('/user/cancel-item/:orderId/:itemId', isLoggedIn, profileController.requestCancellation);
userRoute.post('/user/return-item/:orderId/:itemId', isLoggedIn, profileController.requestReturn);
userRoute.post('/user/retry-razorpay-payment/:orderId', isLoggedIn, profileController.retryRazorpayPayment);
userRoute.post('/user/verify-razorpay-payment', isLoggedIn, profileController.verifyRazorpayPayment);

// cart // order 
userRoute.get('/cart', isLoggedIn,checkUserBlocked, productController.loadCart);
userRoute.post('/add-to-cart',  productController.addToCart);
userRoute.post('/remove-from-cart', isLoggedIn, productController.removeFromCart);
userRoute.post('/update-cart', isLoggedIn, productController.updateCart);
userRoute.post('/add-address', isLoggedIn, orderController.addAddress)
userRoute.post('/placeOrder', isLoggedIn, orderController.placeOrder);
userRoute.get('/orderPlaced', isLoggedIn, orderController.getOrderPlaced);
userRoute.get('/checkout', isLoggedIn,checkUserBlocked, orderController.loadCheckout);
userRoute.post('/create-razorpay-order', isLoggedIn, orderController.createRazorpayOrder);
userRoute.get('/download-invoice/:orderId',isLoggedIn, orderController.generateInvoicePDF);

//coupon
userRoute.get('/user/active-coupons', isLoggedIn, orderController.getActiveCoupons);
userRoute.post('/user/apply-coupon', isLoggedIn, orderController.applyCoupon);

//wallet
userRoute.get('/wallet', isLoggedIn,checkUserBlocked, walletController.loadWallet)

// about
userRoute.get('/aboutus', checkUserBlocked,userController.loadAbout)
userRoute.post('/send-contact', userController.sendContactMessage);

// 404
userRoute.use((req, res) => {
  res.status(404).render('user404');
});
module.exports = userRoute