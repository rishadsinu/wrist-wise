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
const Coupon = require('../../models/coupenModel')
const Wallet = require('../../models/walletModel')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
        const cartItems = cart.items.map(item => {
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

            const itemTotal = discountedPrice * item.quantity;
            cartSubtotal += itemTotal;

            return {
                ...item.toObject(),
                discountedPrice,
                itemTotal
            };
        });

        const shippingCharge = 0;
        const cartTotal = cartSubtotal + shippingCharge;

        res.render('checkout', { 
            addresses, 
            user: req.session.user,
            cartItems,
            cartSubtotal: cartSubtotal.toFixed(2),
            shippingCharge: shippingCharge.toFixed(2),
            cartTotal: cartTotal.toFixed(2),
            couponDiscount: 0,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error loading checkout:', error);
        res.status(500).send('Server error');
    }
};


const getActiveCoupons = async (req, res) => {
    try {
        const currentDate = new Date();
        const activeCoupons = await Coupon.find({
            isListed: true,
            expiryDate: { $gt: currentDate }
        });
        res.json(activeCoupons);
    } catch (error) {
        console.error('Error fetching active coupons:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
const applyCoupon = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const currentDate = new Date();

        const coupon = await Coupon.findOne({ 
            couponCode: couponCode
        });

        if (!coupon) {
            console.log('Coupon not found:', couponCode);
            return res.status(400).json({ success: false, message: 'Invalid coupon code' });
        }

        if (!coupon.isListed) {
            console.log('Coupon is not active (not listed)');
            return res.status(400).json({ success: false, message: 'Coupon is not active' });
        }

        if (currentDate > coupon.expiryDate) {
            console.log('Coupon has expired. Expiry date:', coupon.expiryDate);
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }

        if (cartTotal < coupon.minAmount) {
            console.log('Cart total does not meet minimum amount. Required:', coupon.minAmount);
            return res.status(400).json({ success: false, message: `Minimum purchase amount of ₹${coupon.minAmount} required` });
        }

        const discountAmount = (cartTotal * coupon.discount) / 100;
        const discountedTotal = cartTotal - discountAmount;

        res.json({ 
            success: true, 
            discount: discountAmount.toFixed(2), 
            discountedTotal: discountedTotal.toFixed(2) 
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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
        const appliedCouponCode = req.body.appliedCouponCode;
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
        let couponDiscount = 0;
        let couponDiscountRatio = 0;

        cart.items.forEach(item => {
            totalPrice += item.product.productPrice * item.quantity;
        });

        if (appliedCouponCode) {
            const coupon = await Coupon.findOne({ couponCode: appliedCouponCode });
            if (coupon && coupon.isListed && currentDate <= coupon.expiryDate) {
                couponDiscountRatio = coupon.discount / 100;
                couponDiscount = totalPrice * couponDiscountRatio;
            }
        }

        couponDiscount = Number(couponDiscount.toFixed(2)) || 0;

        const itemsWithDiscounts = cart.items.map(item => {
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
                discountedPrice *= (1 - productOffer.discount / 100);
            } else if (categoryOffer) {
                discountedPrice *= (1 - categoryOffer.discount / 100);
            }

            const couponDiscountForProduct = discountedPrice * couponDiscountRatio;
            discountedPrice -= couponDiscountForProduct;

            return {
                product: product._id,
                quantity: item.quantity,
                price: Number(discountedPrice.toFixed(2)),
                couponDiscountApplied: Number((couponDiscountForProduct * item.quantity).toFixed(2))
            };
        });

        totalPrice = itemsWithDiscounts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPrice = Number(totalPrice.toFixed(2));

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
            couponDiscountAmt: couponDiscount,
            couponCode: appliedCouponCode || '',
            orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        });

        let wallet;
        if (paymentMethod === 'Wallet') {
            wallet = await Wallet.findOne({ user: userId });
            if (!wallet || wallet.balance < totalPrice) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }
            wallet.balance -= totalPrice;
            wallet.transactions.push({
                transactionId: order.orderId,
                description: 'Order Payment',
                amount: totalPrice,
                type: 'debit',
                date: new Date()
            });
            await wallet.save();

            order.paymentStatus = 'Paid';
        } else if (paymentMethod === 'Razorpay' && req.body.razorpayOrderId && req.body.razorpayPaymentId) {
            order.razorpayOrderId = req.body.razorpayOrderId;
            order.razorpayPaymentId = req.body.razorpayPaymentId;
            
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${order.razorpayOrderId}|${order.razorpayPaymentId}`)
                .digest('hex');

            if (generatedSignature !== req.body.razorpaySignature) {
                return res.status(400).json({ success: false, message: 'Invalid Razorpay signature' });
            }
            
            order.paymentStatus = 'Paid';
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

        res.json({ 
            success: true, 
            message: 'Order placed successfully', 
            orderId: order._id,
            newWalletBalance: paymentMethod === 'Wallet' ? wallet.balance : undefined
        });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Error placing order', error: error.message });
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
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to place an order' });
        }

        const userId = req.session.user._id;
        const appliedCouponCode = req.body.appliedCouponCode;
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        let totalPrice = 0;
        let couponDiscount = 0;
        let couponDiscountRatio = 0;

        cart.items.forEach(item => {
            totalPrice += item.product.productPrice * item.quantity;
        });

        if (appliedCouponCode) {
            const coupon = await Coupon.findOne({ couponCode: appliedCouponCode });
            if (coupon && coupon.isListed && currentDate <= coupon.expiryDate) {
                couponDiscountRatio = coupon.discount / 100;
                couponDiscount = totalPrice * couponDiscountRatio;
            }
        }

        couponDiscount = Number(couponDiscount.toFixed(2)) || 0;

        const itemsWithDiscounts = cart.items.map(item => {
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
                discountedPrice *= (1 - productOffer.discount / 100);
            } else if (categoryOffer) {
                discountedPrice *= (1 - categoryOffer.discount / 100);
            }

            const couponDiscountForProduct = discountedPrice * couponDiscountRatio;
            discountedPrice -= couponDiscountForProduct;

            return {
                product: product._id,
                quantity: item.quantity,
                price: Number(discountedPrice.toFixed(2))
            };
        });

        totalPrice = itemsWithDiscounts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPrice = Number(totalPrice.toFixed(2));

        const options = {
            amount: Math.round(totalPrice * 100), 
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
        res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
    }
};
const generateInvoicePDF = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument({ margin: 50 });
        const filename = `invoice-${order.orderId}.pdf`;

        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Helper function to draw text
        const drawText = (text, x, y, options = {}) => {
            doc.text(text, x, y, { ...options, continued: false });
        };

        // Add content to the PDF
        doc.fontSize(20).font('Helvetica-Bold').text('Invoice', { align: 'center' });
        doc.moveDown();

        // Order ID and Date
        doc.fontSize(10).font('Helvetica');
        drawText(`Order ID: ${order.orderId}`, 50, 100);
        drawText(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 115);

        // Shipping Address
        doc.fontSize(12).font('Helvetica-Bold');
        drawText('Shipping Address', 50, 145);
        doc.fontSize(10).font('Helvetica');
        drawText(order.address.addressName, 50, 160);
        drawText(order.address.addressStreet, 50, 175);
        drawText(order.address.addressHouse, 50, 190);
        drawText(`${order.address.addressCity}, ${order.address.addressState} ${order.address.addressPin}`, 50, 205);
        drawText(`Phone: ${order.address.addressMobile}`, 50, 220);
        drawText(`Email: ${order.address.addressEmail}`, 50, 235);

        // Order Summary
        doc.fontSize(12).font('Helvetica-Bold');
        drawText('Order Summary', 300, 145);
        doc.fontSize(10).font('Helvetica');
        drawText(`Payment Method: ${order.paymentMethod}`, 300, 160);
        drawText(`Total Amount: ₹${order.totalPrice.toFixed(2)}`, 300, 175);

        // Invoice Details Table
        doc.fontSize(12).font('Helvetica-Bold');
        drawText('Invoice Details', 50, 280);

        const tableTop = 300;
        const tableLeft = 50;
        const tableWidth = 500;
        const tableHeight = 30 + (order.items.length * 30);

        // Draw table border
        doc.rect(tableLeft, tableTop, tableWidth, tableHeight).stroke();

        // Table headers
        const drawTableHeader = () => {
            doc.fontSize(10).font('Helvetica-Bold');
            drawText('Item', tableLeft + 10, tableTop + 10);
            drawText('Description', tableLeft + 50, tableTop + 10);
            drawText('Quantity', tableLeft + 300, tableTop + 10);
            drawText('Price', tableLeft + 370, tableTop + 10);
            drawText('Amount', tableLeft + 440, tableTop + 10);
        };

        drawTableHeader();

        // Table content
        doc.fontSize(10).font('Helvetica');
        order.items.forEach((item, index) => {
            const y = tableTop + 30 + (index * 30);
            drawText((index + 1).toString(), tableLeft + 10, y + 10);
            drawText(item.product.productTitle, tableLeft + 50, y + 10);
            drawText(item.quantity.toString(), tableLeft + 300, y + 10);
            drawText(`₹${item.price.toFixed(2)}`, tableLeft + 370, y + 10);
            drawText(`₹${(item.price * item.quantity).toFixed(2)}`, tableLeft + 440, y + 10);

            // Draw horizontal line for each row
            doc.moveTo(tableLeft, y).lineTo(tableLeft + tableWidth, y).stroke();
        });

        // Total
        const totalY = tableTop + tableHeight + 10;
        doc.fontSize(12).font('Helvetica-Bold');
        drawText(`Total: ₹${order.totalPrice.toFixed(2)}`, tableLeft + 440, totalY);

        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
};

module.exports = {
    loadCheckout,
    getOrderPlaced,
    placeOrder,
    addAddress,
    createRazorpayOrder,
    getActiveCoupons,
    applyCoupon,
    generateInvoicePDF
}