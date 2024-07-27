
const mongoose = require("mongoose");




const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: function() { return !this.googleId; }
    },
    password: {
        type: String,
        required: function() { return !this.googleId; }
    },
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
        unique: true,
        sparse: true
    }
});

module.exports = mongoose.model("User",userSchema);
