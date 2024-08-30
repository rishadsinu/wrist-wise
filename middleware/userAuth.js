const User = require("../models/userModel");

const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.returnTo = req.originalUrl;
        res.redirect('/login');
    }
};

const preventLoginPageAccess = (req, res, next) => {
    if (req.session.user) {
        res.redirect('/home');
    } else {
        next();
    }
};


module.exports = {
    isLoggedIn,
    preventLoginPageAccess,
};