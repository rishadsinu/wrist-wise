const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const express = require("express");
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000
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

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Successfully connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/assets", express.static(path.join(__dirname, "public/user")));  
app.use("/adminAssets" ,express.static(path.join(__dirname,"public/admin/adminAssets")));

const userRoute = require('./routes/userRoute')
app.use('/', userRoute)

const adminRoute = require('./routes/adminRoute');
app.use('/admin', adminRoute)

app.listen(port, () => {
    console.log(`Listening to the server on http://localhost:${port}`);
});


