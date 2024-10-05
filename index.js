const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const express = require("express");
const app = express();
require('dotenv').config();
const port = process.env.PORT
const nocache = require("nocache");
const passport = require('passport');
const session = require("express-session");
const path = require('path');
const mongoUri = process.env.MONGODB_URI;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(nocache());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(nocache());

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/assets", express.static(path.join(__dirname, "./public/user/assets")));  
app.use("/adminAssets" ,express.static(path.join(__dirname,"public/admin/adminAssets")));

app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use("/assets", express.static(path.join(__dirname, "public/userimages")));

const adminRoute = require('./routes/adminRoute');
const userRoute = require('./routes/userRoute');

app.use('/admin', adminRoute);
app.use('/', userRoute);

app.listen(port, () => {
    console.log(`Listening to the server on http://localhost:${port}`);
});


