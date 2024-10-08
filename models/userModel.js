
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: function () { return !this.googleId; }
    },
    password: {
        type: String,
        required: function () { return !this.googleId; }
    },

    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    is_verified: {
        type: Number,
        default: 0
    },
    otp: String,
    otpExpiry: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    googleId: {
        type: String,
        sparse: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
