
const express = require("express");
const userRoute = express()

const session = require("express-session");

userRoute.set("view engine","ejs");
userRoute.set('views','./views/user')

const path = require('path');
const userController = require('../controllers/userController');

userRoute.get('/', userController.loadHome);
userRoute.get('/wishlist.html',userController.loadWishlist);
userRoute.get('/cart.html',userController.loadCart);


module.exports = userRoute