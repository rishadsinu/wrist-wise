
const express = require("express");
const userRoute = express()
const session = require("express-session");
const passport = require('passport');
require('../config/passportConfig');
const { isLoggedIn } = require('../middleware/userAuth');
userRoute.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Set to false to prevent session from being saved on every request
    saveUninitialized: true, // Set to true to save uninitialized sessions
    cookie: { secure: false } // Set to true if using HTTPS
}));

userRoute.set("view engine","ejs");
userRoute.set('views','./views/user')

const path = require('path');
const userController = require('../controllers/userController');

userRoute.get('/', userController.loadHome);
userRoute.get('/home', userController.loadHome);
userRoute.get('/wishlist', isLoggedIn, userController.loadWishlist);
userRoute.get('/cart', isLoggedIn, userController.loadCart);
userRoute.get('/registration',userController.loadRegister);
userRoute.post('/registration',userController.insertUser)
userRoute.post('/resend-otp', userController.resendOTP);
userRoute.get('/login',userController.loadLogin);
userRoute.post('/login',userController.verifylogin);
userRoute.post('/verify-otp',userController.verifyOTP);

// Google OAuth routes
userRoute.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );
  
  userRoute.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    userController.googleLogin
  );

//   const setReturnTo = (req, res, next) => {
//     if (!req.session.user) {
//         req.session.returnTo = req.originalUrl;
//     }
//     next();
// };
//userRoute.get('/wishlist', setReturnTo, userController.loadWishlist);
//userRoute.get('/cart', setReturnTo, userController.loadCart);


module.exports = userRoute