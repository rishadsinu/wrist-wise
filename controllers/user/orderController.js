const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Offer = require('../../models/offerModel')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadCheckout = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login?message=' + encodeURIComponent('Please log in to proceed to checkout'));
        }

        const userId = req.session.user._id;
        const addresses = await Address.find({ userId });
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart?message=' + encodeURIComponent('Your cart is empty'));
        }
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        let cartSubtotal = 0;
        cart.items.forEach(item => {
            let discountedPrice = item.product.productPrice;
            
            const productOffer = activeOffers.find(offer =>
                offer.type === 'product' && 
                offer.products.includes(item.product._id)
            );

            const categoryOffer = activeOffers.find(offer =>
                offer.type === 'category' && 
                offer.categories.includes(item.product.category)
            );

            if (productOffer && (!categoryOffer || productOffer.discount > categoryOffer.discount)) {
                discountedPrice = item.product.productPrice * (1 - productOffer.discount / 100);
            } else if (categoryOffer) {
                discountedPrice = item.product.productPrice * (1 - categoryOffer.discount / 100);
            }

            cartSubtotal += discountedPrice * item.quantity;
        });

        const shippingCharge = 0; 
        const cartTotal = cartSubtotal + shippingCharge;

        res.render('checkout', { 
            addresses, 
            user: req.session.user,
            cartSubtotal: cartSubtotal.toFixed(2),
            shippingCharge: shippingCharge.toFixed(2),
            cartTotal: cartTotal.toFixed(2),
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error loading checkout:', error);
        res.status(500).send('Server error');
    }
};

const addAddress = async (req, res) => {
    try {
        const user = req.session.user._id
        const { fullName, email, phone, pinCode, streetAddress, appartmentnumber, town, city, state } = req.body
        const newAddress = new Address({
            fullName,
            email,
            phone,
            pinCode,
            streetAddress,
            appartmentnumber,
            town,
            city,
            state
        })
        await newAddress.save()
        res.json({ success: true })
    } catch (error) {
        console.log(error);

    }
}

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
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        let totalPrice = 0;
        const itemsWithDiscounts = await Promise.all(cart.items.map(async item => {
            const product = item.product;
            let discountedPrice = product.productPrice;

            const productOffer = activeOffers.find(offer => 
                offer.type === 'product' && 
                offer.products.includes(product._id)
            );

            const categoryOffer = activeOffers.find(offer => 
                offer.type === 'category' && 
                offer.categories.includes(product.category._id)
            );

            if (productOffer && (!categoryOffer || productOffer.discount > categoryOffer.discount)) {
                discountedPrice = product.productPrice * (1 - productOffer.discount / 100);
            } else if (categoryOffer) {
                discountedPrice = product.productPrice * (1 - categoryOffer.discount / 100);
            }

            const finalPrice = discountedPrice * item.quantity;
            totalPrice += finalPrice;

            return {
                product: product._id,
                quantity: item.quantity,
                price: discountedPrice
            };
        }));

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
            items: itemsWithDiscounts,
            totalPrice: totalPrice,
            orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        });

        if (paymentMethod === 'Razorpay') {
            order.razorpayOrderId = req.body.razorpayOrderId;
            order.razorpayPaymentId = req.body.razorpayPaymentId;
            
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${order.razorpayOrderId}|${order.razorpayPaymentId}`)
                .digest('hex');

            if (generatedSignature !== req.body.razorpaySignature) {
                return res.status(400).json({ success: false, message: 'Invalid Razorpay signature' });
            }
        }

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
        res.status(500).json({ success: false, message: 'Error placing order' });
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
        res.render('orderPlaced', { order: order, user });
    } catch (error) {
        console.error(error);
    }
};

const createRazorpayOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

        const totalPrice = cart.items.reduce((acc, item) => {
            return acc + item.product.productDiscountedPrice * item.quantity;
        }, 0);

        const options = {
            amount: totalPrice * 100, 
            currency: 'INR',
            receipt: `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ success: false, message: 'Error creating order' });
    }
};
module.exports = {
    loadCheckout,
    getOrderPlaced,
    placeOrder,
    addAddress,
    createRazorpayOrder
}