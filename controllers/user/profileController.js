const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');


const loadUserProfile = async (req, res) => {
    try {
        const user = req.session.user
        res.render('profileDashboard', { user });
    } catch (error) {
        res.redirect('/login?message=' + encodeURIComponent('Please log in to view your wishlist'));
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { name, phone } = req.body;

        await User.findByIdAndUpdate(userId, { name, phone });

        req.session.user = { ...req.session.user, name, phone };

        res.redirect('/userprofile');
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).send('An error occurred while updating your profile');
    }
};

const loadChangePasswordPage = async (req, res) => {
    res.render('changePassword', { message: null });
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('changePassword', { message: { type: 'danger', text: 'Current password is incorrect' } });
        }

        if (newPassword !== confirmPassword) {
            return res.render('changePassword', { message: { type: 'danger', text: 'New password and confirm password do not match' } });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });
        res.redirect('/userprofile?passwordChanged=true');
    } catch (error) {
        console.error('Error changing password:', error);
        res.render('changePassword', { message: { type: 'danger', text: 'An error occurred while changing the password' } });
    }
};

const loadProfileAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId: userId });
        res.render("profileAddress", { addresses: addresses });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred');
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const newAddress = new Address({
            userId: userId,
            fullName: req.body.fullName,
            streetAddress: req.body.streetAddress,
            apartmentNumber: req.body.apartmentNumber,
            state: req.body.state,
            city: req.body.city,
            town: req.body.town,
            pinCode: req.body.pinCode,
            phone: req.body.phone,
            email: req.body.email
        });

        await newAddress.save();
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
};


const updateAddress = async (req, res) => {
    try {
        const { id, fullName, streetAddress, apartmentNumber, city, town, pinCode, phone } = req.body;

        await Address.findByIdAndUpdate(id, {
            fullName,
            streetAddress,
            apartmentNumber,
            city,
            town,
            pinCode,
            phone
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ success: false, error: 'Server error while updating address.' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        await Address.findByIdAndDelete(addressId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, error: 'Failed to delete address' });
    }
};

const loadProfileOrders = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 });

        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            createdAt: order.createdAt,
            status: order.items[0].order_status,
            totalPrice: order.totalPrice
        }));

        res.render('profileOrders', { orders: formattedOrders, user: req.session.user });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const requestCancellation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { cancelReason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.items.forEach(item => {
            item.order_status = 'Cancellation Requested';
            item.cancel_reason = cancelReason;
        });

        await order.save();

        res.status(200).json({ message: 'Cancellation request submitted successfully.' });
    } catch (error) {
        console.error('Error handling cancellation request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    loadUserProfile,
    updateUserProfile,
    loadChangePasswordPage,
    changePassword,
    loadProfileAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    loadProfileOrders,
    getOrderDetails,
    requestCancellation
}