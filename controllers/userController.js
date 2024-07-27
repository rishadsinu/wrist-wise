
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator')


const securePassword = async (password) => {
    try {
        const saltRounds = 10; // Define the number of salt rounds
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
        res.render('home',{user});
    } catch (error) {
        console.log(error.message);
    }
}

// registration user

const loadRegister = async (req, res) => {
    try {
       
        res.render('registration');

    } catch (error) {
        console.log(error.massage);
    }
}


const insertUser = async (req, res) => {
    try {
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
            isVerified: false
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

        // Generate new OTP
        const newOTP = Math.floor(1000 + Math.random() * 9000).toString();
        const newOTPExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        // Update user with new OTP
        user.otp = newOTP;
        user.otpExpiry = newOTPExpiry;
        await user.save();

        // Send new OTP via email
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
                email: user.email  // Pass email for potential resend
            });
        }

        // OTP is valid
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Login the user
        req.session.user = user;

        // Redirect to home page
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
}

const loadWishlist = (req, res) => {
    if (req.session.user) {
        res.render('wishlist');
    } else {
        res.redirect('/login?message=' + encodeURIComponent('Please log in to view your wishlist'));
    }
};

const loadCart = (req, res) => {
    if (req.session.user) {
        res.render('cart');
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

        // Find user by email
        const userData = await User.findOne({ email: email });

        if (userData) {
            // Compare password with hashed password in the database
            const passwordMatch = await bcrypt.compare(password, userData.password);

            if (passwordMatch) {
                if (!userData.is_verified) {
                    req.session.user = userData;
                    // Check if there's a returnTo URL in the session
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
    // Successful authentication, redirect home.
    req.session.user = req.user;
    res.redirect('/home');
};





module.exports = {
    loadHome,
    loadWishlist,
    loadCart,
    loadRegister,
    verifyOTP,
    resendOTP,
    loadLogin,
    verifylogin,
    insertUser,
    googleLogin,

}