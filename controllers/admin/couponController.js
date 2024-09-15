const Coupon = require('../../models/coupenModel')

const loadCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ addedDateTime: -1 });
        res.render('coupon', { coupons });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred while loading coupons');
    }
};

const addCoupon = async (req, res) => {
    try {
        const { couponCode, couponName, discount, minAmount, expiryDate, isListed } = req.body;

        const newCoupon = new Coupon({
            couponCode,
            couponName,
            discount,
            minAmount,
            expiryDate,
            isListed
        });

        const savedCoupon = await newCoupon.save();

        res.json({ success: true, message: 'Coupon added successfully', coupon: savedCoupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error adding coupon: ' + error.message });
    }
};
const getCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.json(coupon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching coupon: ' + error.message });
    }
};
const updateCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const { couponCode, couponName, discount, minAmount, expiryDate, isListed } = req.body;

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            { couponCode, couponName, discount, minAmount, expiryDate, isListed },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error updating coupon: ' + error.message });
    }
};
const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error deleting coupon: ' + error.message });
    }
};

module.exports = {
    loadCoupon,
    addCoupon,
    getCoupon,
    updateCoupon,
    deleteCoupon
}