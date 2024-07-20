const express = require("express");
const user_route = express();

const session = require("express-session");

user_route.set("view engine","ejs");

user_route.get('/home', userController.loadHome)


module.exports = user_route