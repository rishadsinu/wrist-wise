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

const checkUserBlocked = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return next();
        }

        const user = await User.findById(req.session.user);
        if (!user) {
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
                return res.redirect('/login');
            });
        } else if (user.isBlocked) {
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
                return res.redirect('/login?message=Your account has been blocked. Please contact support.');
            });
        } else {
            next();
        }
    } catch (error) {
        console.error('Error in checkUserBlocked middleware:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    isLoggedIn,
    preventLoginPageAccess,
    checkUserBlocked
};