const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const express = require("express");
const app = express()
require('dotenv').config()
const port = process.env.PORT || 3000
const nocache = require("nocache");
const passport = require('passport');
const session = require("express-session");
const mongoUri = process.env.MONGODB_URI;

// Set up session
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



const userRoute = require('./routes/userRoute')
app.use('/', userRoute)
const path = require('path');


app.use("/assets", express.static(path.join(__dirname, "public/user")));  // Set user assets


app.listen(port, () => {
    console.log(`Listening to the server on http://localhost:${port}`);
});


