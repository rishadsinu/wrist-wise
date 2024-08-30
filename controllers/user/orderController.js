const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');


const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user
        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });

        res.render('checkout', { addresses, user });
    } catch (error) {
        console.log(error);
        res.status(500).send('Error retrieving addresses');
    }
};

const getCartSummery = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }
        const userId = req.session.user._id;
        let cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart) {
            return res.json({ success: true, subtotal: 0, total: 0 });
        }
        let cartSubtotal = 0;
        cart.items.forEach(item => {
            cartSubtotal += item.quantity * item.product.productDiscountedPrice;
        });

        const shippingCharge = 0;
        const total = cartSubtotal + shippingCharge;

        res.json({ success: true, subtotal: cartSubtotal.toFixed(2), total: total.toFixed(2) });
    } catch (error) {
        console.error('Error fetching cart summary:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
};

const placeOrder = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to place an order' });
        }

        const userId = req.session.user._id;
        const selectedAddressId = req.body.selectedAddress;
        const paymentMethod = req.body.paymentMethod;
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }
        const selectedAddress = await Address.findById(selectedAddressId);

        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: 'Selected address not found' });
        }
        const totalPrice = cart.items.reduce((acc, item) => {
            return acc + item.product.productDiscountedPrice * item.quantity;
        }, 0);
        const order = new Order({
            userId: userId,
            address: {
                addressName: selectedAddress.fullName,
                addressEmail: selectedAddress.email,
                addressMobile: selectedAddress.phone,
                addressHouse: selectedAddress.apartmentNumber,
                addressStreet: selectedAddress.streetAddress,
                addressPost: selectedAddress.town,
                addressCity: selectedAddress.city,
                addressState: selectedAddress.state,
                addressPin: selectedAddress.pinCode,
            },
            paymentMethod: paymentMethod,
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.productDiscountedPrice,
            })),
            totalPrice: totalPrice,
            orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        });
        await order.save();

        for (let item of cart.items) {
            await Product.findByIdAndUpdate(
                item.product._id,
                { $inc: { stock: -item.quantity } }, 
                { new: true }
            );
        }

        cart.items = [];
        await cart.save();

        res.json({ success: true, message: 'Order placed successfully', orderId: order._id });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'An error occurred while placing the order' });
    }
};

const getOrderPlaced = async (req, res) => {
    try {
        const user = req.session.user
        const orderId = req.query.orderId;
        const order = await Order.findById(orderId).populate('items.product');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderPlaced', {order: order, user});
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
    loadCheckout,
    getCartSummery,
    getOrderPlaced,
    placeOrder
}