const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        // Store the intended destination
        req.session.returnTo = req.originalUrl;
        res.redirect('/login');
    }
};

module.exports = {
    isLoggedIn
};