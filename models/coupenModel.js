const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true
    },
    couponName: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    minAmount: {
        type: Number,
        required: true
    },
    isListed: {
        type: Boolean,
        required: true,
        default: true
    },
    addedDateTime: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true,
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;