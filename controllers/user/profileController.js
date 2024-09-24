const bcrypt = require("bcrypt");
const User = require("../../models/userModel");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');


const loadUserProfile = async (req, res) => {
    try {
        const user = req.session.user
        res.render('profileDashboard', { user });
    } catch (error) {
        res.redirect('/login');
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.session.user._id
        const { name, phone } = req.body
        await User.findByIdAndUpdate(userId, { name, phone })
        req.session.user = { ...req.session.user, name, phone }
        res.redirect('/userprofile')

    } catch (error) {
        console.log(error);
    }
}

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
        res.render('changePassword');
    }
};

const loadProfileAddress = async (req, res) => {
    try {
        const user = req.session.user
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId: userId });
        res.render("profileAddress", { addresses: addresses , user});
    } catch (error) {
        console.log(error);
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
    }
};

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        await Address.findByIdAndDelete(addressId);
        res.json({ success: true });
    } catch (error) {
        console.error( error);
    }
};

const loadProfileOrders = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        const userId = req.session.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6; 
        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'items.product',
                select: 'productImages' 
            });

        const formattedOrders = orders.map(order => {
            const firstItem = order.items[0];
            const product = firstItem && firstItem.product;
            const productImages = product && product.productImages ? product.productImages : [];

            return {
                _id: order._id,
                orderId: order.orderId,
                createdAt: order.createdAt,
                status: firstItem.order_status,
                totalPrice: order.totalPrice,
                productImages: productImages 
            };
        });

        res.render('profileOrders', {
            orders: formattedOrders,
            user: req.session.user,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error in loadProfileOrders:', error);
        res.status(500).send('Server error: ' + error.message);
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
        console.error(error);
    }
};

const requestCancellation = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { cancelReason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        if (item.order_status === 'Cancelled' || item.order_status === 'Delivered') {
            return res.status(400).json({ error: 'Cannot request cancellation for this item.' });
        }
        item.order_status = 'Cancellation Requested';
        item.cancelReason = cancelReason;
        await order.save();
        
        res.status(200).json({ message: 'Cancellation request submitted successfully.' });
    } catch (error) {
        console.error(error);
    }
};

const requestReturn = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { returnReason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (item.order_status !== 'Delivered') {
            return res.status(400).json({ error: 'Return can only be requested for delivered items.' });
        }

        item.order_status = 'Return Requested';
        item.returnReason = returnReason;
        await order.save();
        
        res.status(200).json({ message: 'Return request submitted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
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
    requestCancellation,
    requestReturn
}