
const express = require("express");
const userRoute = express()

const session = require("express-session");

userRoute.set("view engine","ejs");
userRoute.set('views','./views/user')

const path = require('path');
const userController = require('../controllers/userController');

userRoute.get('/', userController.loadHome)


module.exports = userRoute