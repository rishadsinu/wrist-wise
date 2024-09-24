
const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const crypto = require('crypto')
const Wishlist = require('../../models/wishlistModel')
const Offer = require('../../models/offerModel')
const Coupon = require('../../models/coupenModel')

const loadHome = async (req, res) => {
    try {
        const user = req.session.user
        res.render('home', { user });
    } catch (error) {
        console.log(error.message);
    }
}

const loadRegister = async (req, res) => {
    try {
        res.render('registration');
    } catch (error) {
        console.log(error.massage);
    }
}

const insertUser = async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.render('registration', { message: "Email already exists." });
        }
        const hashedPassword = await securePassword(req.body.password);
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);
        const tempUser = {
            name: req.body.fullname,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            otp: otp,
            otpExpiry: otpExpiry
        };
        req.session.tempUser = tempUser;
        await sendOTPEmail(tempUser.email, otp);

        return res.render('verifyOTP', {
            message: "Please enter the OTP sent to your email.",
            email: tempUser.email
        });
    } catch (error) {
        console.log(error.message);
        return res.render('registration', { message: "error" });
    }
};
async function sendOTPEmail(email, otp) {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    await transporter.sendMail({
        from: '"Your App" wristwisewatches@gmail.com',
        to: email,
        subject: "Wrist Wise Watches  Your OTP for registration",
        text: `Your OTP is: ${otp}. It will expire in 2 minutes.`,
        html: `<b>Your OTP is: ${otp}</b><br>It will expire in 2 minutes.`,
    });
}

const securePassword = async (password) => {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw error;
    }
};

const resendOTP = async (req, res) => {
    try {
        const email = req.session.tempUser.email;
        if (!email) {
            return res.json({ success: false, message: "User not found." });
        }
        const currentTime = new Date();
        const lastOTPTime = new Date(req.session.tempUser.otpSentTime || 0);
        const timeDifference = (currentTime - lastOTPTime) / 1000;

        if (timeDifference < 60) {
            return res.json({ success: false });
        }
        const newOTP = Math.floor(1000 + Math.random() * 9000).toString();
        const newOTPExpiry = new Date(Date.now() + 2 * 60 * 1000);
        req.session.tempUser.otp = newOTP;
        req.session.tempUser.otpExpiry = newOTPExpiry;
        req.session.tempUser.otpSentTime = currentTime;

        await sendOTPEmail(email, newOTP);
        return res.json({ success: true, message: "New OTP sent successfully." });
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: "Failed to resend OTP." });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { otp, email } = req.body;
        const tempUser = req.session.tempUser;
        if (!tempUser) {
            return res.render('verifyOTP', { email });
        }
        if (tempUser.email !== email) {
            return res.render('verifyOTP', { message: "Invalid email.", email });
        } 
        if (tempUser.otp !== otp || tempUser.otpExpiry < new Date()) {
            return res.render('verifyOTP', { message: "Invalid or expired OTP.", email });
        }
        const user = new User({
            name: tempUser.name,
            email: tempUser.email,
            phone: tempUser.phone,
            password: tempUser.password,
            is_admin: 0,
            isVerified: true
        });
        await user.save();
        req.session.tempUser = undefined;
        req.session.user = user;

        res.redirect('/home');
    } catch (error) {
        console.log(error.message);
        res.render('verifyOTP', { message: "An error occurred during verification.", email: req.body.email });
    }
};

const loadLogin = async (req, res) => {
    try {
        const message = req.query.message;
        res.render('login', { message });
    } catch (error) {
        console.log(error.message);
    }
};

const addToWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to add items to your wishlist' });
        }
        const { productId } = req.body;
        const userId = req.session.user._id;
        
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, products: [] });
        }
        
        if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
        }

        res.json({ success: true, message: 'Product added to wishlist successfully' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ success: false, message: 'An error occurred while adding to wishlist' });
    }
};

const loadWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login?message=' + encodeURIComponent('Please log in to view your wishlist'));
        }

        const userId = req.session.user._id;
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products');

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        const wishlistWithOffers = wishlist ? wishlist.products.map(product => {
            let discountedPrice = product.productPrice;
            let appliedOffer = null;

            const productOffer = activeOffers.find(offer =>
                offer.type === 'product' && 
                offer.products.includes(product._id)
            );

            const categoryOffer = activeOffers.find(offer =>
                offer.type === 'category' && 
                offer.categories.includes(product.category)
            );

            if (productOffer && (!categoryOffer || productOffer.discount > categoryOffer.discount)) {
                discountedPrice = product.productPrice * (1 - productOffer.discount / 100);
                appliedOffer = productOffer;
            } else if (categoryOffer) {
                discountedPrice = product.productPrice * (1 - categoryOffer.discount / 100);
                appliedOffer = categoryOffer;
            }

            return {
                ...product.toObject(),
                discountedPrice: discountedPrice.toFixed(2),
                appliedOffer: appliedOffer
            };
        }) : [];

        res.render('wishlist', {
            user: req.session.user,
            wishlist: wishlistWithOffers
        });
    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.status(500).render('error', { message: 'An error occurred while loading the wishlist' });
    }
};
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;
        
        const wishlist = await Wishlist.findOne({ user: userId });
 
        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();

        res.json({ success: true, message: 'Product removed from wishlist successfully' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'An error occurred while removing from wishlist' });
    }
};
const verifylogin = async (req, res) => {
    try {
        const { 'singin-email': email, 'singin-password': password } = req.body;

        if (!email || !password) {
            return res.render('login', { message: 'Email and password are required' });
        }
        const userData = await User.findOne({ email: email });

        if (userData) {
            if (userData.isBlocked) {
                return res.render('login', { message: 'Your account has been blocked. Please contact support.' });
            }
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.isVerified) {
                    req.session.user = userData;
                    const returnTo = req.session.returnTo || '/home';
                    delete req.session.returnTo;
                    return res.redirect(returnTo);
                } else {
                    return res.render('login', { message: 'Please verify your email!' });
                }
            } else {
                return res.render('login', { message: 'Email and password are incorrect' });
            }
        } else {
            return res.render('login', { message: 'Email and password are incorrect' });
        }
    } catch (error) {
        console.log(error.message);
        return res.render('login', { message: 'An error occurred during login' });
    }
};

const googleLogin = (req, res) => {
    req.session.user = req.user;
    res.redirect('/home');
};

const userLogout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out, please try again' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
};

const loadForgotPassword = (req, res) => {
    res.render('forgotPassword');
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).render('forgot-password', { message: 'User not found' });
        }
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Link',
            text: `You can change your Wrist Wise account's password usig this link.\n\n
                Please click on the following link, and reset your password:\n\n
                http://${req.headers.host}/reset-password/${token}\n\n`
        };
        await transporter.sendMail(mailOptions);
        res.render('forgotPassword', { message: 'email has been sent into your email account.' });
    } catch (error) {
        console.error(error);
    }
};

const loadResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).render('reset-password', { message: 'Password token is invalid .', token: req.params.token });
        }
        res.render('resetPassword', { token: req.params.token });
    } catch (error) {
        console.error(error);
    }
};

const resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).render('reset-password', { message: ' token is invalid.', token: req.params.token });
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.render('login');
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
    loadHome,
    loadWishlist,
    loadRegister,
    verifyOTP,
    resendOTP,
    loadLogin,
    verifylogin,
    insertUser,
    googleLogin,
    userLogout,
    loadForgotPassword,
    forgotPassword,
    loadResetPassword,
    resetPassword,
    addToWishlist,
    removeFromWishlist
}