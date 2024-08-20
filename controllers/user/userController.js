
const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');

const securePassword = async (password) => {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
};

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

        const user = new User({
            name: req.body.fullname,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            is_admin: 0,
            otp: otp,
            otpExpiry: otpExpiry,
            isVerified: false,
            isBlocked: false
        });

        const userdata = await user.save();

        if (userdata) {
            await sendOTPEmail(userdata.email, otp);
            req.session.userId = userdata._id;
            return res.render('verifyOTP', {
                message: "Your registration has been completed. Please enter the OTP sent to your email.",
                email: userdata.email
            });
        } else {
            return res.render('registration', { message: "Your registration has failed." });
        }
    } catch (error) {
        console.log(error.message);
        return res.render('registration', { message: "An error occurred during registration." });
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
        from: '"Your App" <your-email@gmail.com>',
        to: email,
        subject: "Wrist Wise Watches Your OTP for registration",
        text: `Your OTP is: ${otp}. It will expire in 2 minutes.`,
        html: `<b>Your OTP is: ${otp}</b><br>It will expire in 2 minutes.`,
    });
}

const resendOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found." });
        }
        const newOTP = Math.floor(1000 + Math.random() * 9000).toString();
        const newOTPExpiry = new Date(Date.now() + 2 * 60 * 1000);

        user.otp = newOTP;
        user.otpExpiry = newOTPExpiry;
        await user.save();

        await sendOTPEmail(user.email, newOTP);

        res.json({ success: true, message: "New OTP sent successfully." });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: "Failed to resend OTP." });
    }
};


const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.session.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.render('verifyOTP', { message: "User not found." });
        }
        if (user.otp !== otp || user.otpExpiry < new Date()) {
            return res.render('verifyOTP', {
                message: "Invalid or expired OTP.",
                email: user.email
            });
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        req.session.user = user;

        res.redirect('/home');

    } catch (error) {
        console.log(error.message);
        res.render('verifyOTP', { message: "An error occurred during verification." });
    }
};

const loadLogin = async (req, res) => {
    try {
        res.render('login', { message: req.query.message });
    } catch (error) {
        console.log(error.message);
    }
};

const loadWishlist = (req, res) => {
    if (req.session.user) {
        res.render('wishlist');
    } else {
        res.redirect('/login?message=' + encodeURIComponent('Please log in to view your wishlist'));
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

const loadForgotPassword = async (req, res) => {
    try {
        res.render('forgotPassword', { message: null });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Error loading forgot password page');
    }
};


const sendResetPasswordLink = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgotPassword', { message: 'User not found' });
        }
        
        const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        const resetLink = `${req.protocol}://${req.hostname}:${process.env.PORT}/resetpassword/${resetToken}`;
        
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Link',
            text: `Please use the following link to reset your password: ${resetLink}`
        };

        await transporter.sendMail(mailOptions);
        
        res.render('forgotPassword', { message: 'Reset link sent to your email' });
    } catch (error) {
        console.error('Error sending reset password link:', error);
        res.status(500).send('An error occurred while sending the reset password link');
    }
};

const loadResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } 
        });
        if (!user) {
            return res.render('resetPassword', { message: 'Invalid or expired token', token: null });
        }
        res.render('resetPassword', { token, message: null });
    } catch (error) {
        console.error('Error loading reset password page:', error);
        res.status(500).send('An error occurred while loading the reset password page');
    }
};

const userLogout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again' });
    }
    res.status(200).json({ message: 'Logout successful' });
  });
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
    loadForgotPassword,
    sendResetPasswordLink,
    loadResetPassword,
    userLogout

}