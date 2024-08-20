
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

// Model
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');

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
userRoute.get('/wishlist', isLoggedIn, userController.loadWishlist);
userRoute.get('/category', categoryController.loadCategory);

// login  registration /  OTP  
userRoute.get('/registration', userController.loadRegister);
userRoute.post('/registration', userController.insertUser)
userRoute.post('/resend-otp', userController.resendOTP);
userRoute.get('/login', preventLoginPageAccess, userController.loadLogin);
userRoute.post('/login', preventLoginPageAccess, userController.verifylogin);
userRoute.post('/verify-otp', userController.verifyOTP);
userRoute.post('/logout', userController.userLogout)

userRoute.get('/forgetpassword', userController.loadForgotPassword)
userRoute.post('/forgotpassword', userController.sendResetPasswordLink);
userRoute.get('/resetpassword/:token', userController.loadResetPassword);

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
userRoute.post('/orders/:orderId/cancel', profileController.requestCancellation);

// cart // order 
userRoute.get('/cart', isLoggedIn, productController.loadCart);
userRoute.post('/add-to-cart', productController.addToCart);
userRoute.post('/remove-from-cart', productController.removeFromCart);
userRoute.post('/update-cart', productController.updateCart);
userRoute.get('/cart-summary', orderController.getCartSummery);
userRoute.get('/checkout', isLoggedIn, orderController.loadCheckout)
userRoute.get('/orderPlaced', orderController.getOrderPlaced)
userRoute.post('/placeOrder', orderController.placeOrder);

module.exports = userRoute