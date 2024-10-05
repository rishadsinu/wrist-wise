const bcrypt = require("bcrypt");
const User = require("../../models/userModel");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
const retryRazorpayPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.payment_status !== 'Pending' || order.paymentMethod !== 'Razorpay') {
            return res.status(400).json({ success: false, message: 'Invalid order status for retry payment' });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.totalPrice * 100),
            currency: 'INR',
            receipt: order.orderId,
            payment_capture: 1
        });

        res.json({
            success: true,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            order: razorpayOrder,
            user: {
                name: req.session.user.name,
                email: req.session.user.email,
                phone: req.session.user.phone
            }
        });
    } catch (error) {
        console.error('Error in retryRazorpayPayment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { orderId, paymentId, razorpayOrderId, signature } = req.body;

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${paymentId}`)
            .digest('hex');

        if (generatedSignature === signature) {
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            order.payment_status = 'Completed';
            order.items.forEach(item => {
                if (item.order_status === 'Payment Failed') {
                    item.order_status = 'Pending';
                }
            });
            order.razorpayPaymentId = paymentId;
            order.razorpayOrderId = razorpayOrderId;
            await order.save();

            res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Error in verifyRazorpayPayment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
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

        const updatedOrders = await Promise.all(
            orders.map(async (order) => {
                const firstItem = order.items[0];
                const product = firstItem && firstItem.product;
                const productImages = product && product.productImages ? product.productImages : [];

                if (order.paymentMethod === 'Cash on Delivery' && firstItem.order_status === 'Delivered' && order.payment_status !== 'Completed') {
                    order.payment_status = 'Completed';
                    await order.save();  
                }

                return {
                    _id: order._id,
                    orderId: order.orderId,
                    createdAt: order.createdAt,
                    status: firstItem.order_status,
                    totalPrice: order.totalPrice,
                    productImages: productImages,
                    payment_status: order.payment_status 
                };
            })
        );

        res.render('profileOrders', {
            orders: updatedOrders,
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

        const firstItem = order.items[0]; 
        if (order.paymentMethod === 'Cash on Delivery' && firstItem.order_status === 'Delivered' && order.payment_status !== 'Completed') {
            order.payment_status = 'Completed';
            await order.save();  
        }

        res.json(order);  
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error: ' + error.message);
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
    requestReturn,
    retryRazorpayPayment,
    verifyRazorpayPayment
}