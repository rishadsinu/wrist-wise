
const express = require("express");
const userRoute = express()
const session = require("express-session");
const passport = require('passport');
require('../config/passportConfig');
const path = require('path');
const { isLoggedIn, preventLoginPageAccess } = require('../middleware/userAuth');
const userController = require('../controllers/userController');

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
userRoute.get('/cart', isLoggedIn, userController.loadCart);
userRoute.get('/category', userController.loadCategory);
userRoute.get('/registration', userController.loadRegister);
userRoute.post('/registration', userController.insertUser)
userRoute.post('/resend-otp', userController.resendOTP);

userRoute.get('/login', preventLoginPageAccess, userController.loadLogin);
userRoute.post('/login', preventLoginPageAccess, userController.verifylogin);

userRoute.post('/verify-otp', userController.verifyOTP);

userRoute.get('/productlist', userController.loadProductlist);
// userRoute.get('/product', userController.loadProduct);

userRoute.get('/productlist', userController.getProducts);
 userRoute.get('/product/:id', userController.getProductDetails);


// Google OAuth routes
userRoute.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

userRoute.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  userController.googleLogin
);

userRoute.get('/userprofile', isLoggedIn, userController.loadUserProfile);
// userRoute.post('/profile', isAuthenticated, userController.updateUserDetails);
// userRoute.get('/change-password', userController.getChangePasswordPage);
// userRoute.post('/change-password', userController.changePassword);


module.exports = userRoute