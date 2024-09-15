const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const Offer = require('../../models/offerModel')
const Coupon = require('../../models/coupenModel')

const loadProductlist = async (req, res) => {
    try {
        const user = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const activeCategories = await Category.find({ status: 'active' });
        const activeCategoryIds = activeCategories.map(cat => cat._id);

        const filter = {
            isListed: true,
            category: { $in: activeCategoryIds }
        };

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(filter)
            .populate('category')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        const productsWithOffers = products.map(product => {
            let discountedPrice = product.productPrice;
            let appliedOffer = null;

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
                appliedOffer = productOffer;
            } else if (categoryOffer) {
                discountedPrice = product.productPrice * (1 - categoryOffer.discount / 100);
                appliedOffer = categoryOffer;
            }

            return {
                ...product.toObject(),
                discountedPrice: discountedPrice.toFixed(2),
                appliedOffer: appliedOffer
            };
        });

        res.render('productslist', {
            products: productsWithOffers,
            user,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error loading product list:', error);
        res.status(500).send('Server error');
    }
};

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ isListed: true });
        res.render('productslist', { products });
    } catch (error) {
        console.error(error);
    }
};

const getProductDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const product = await Product.findOne({ _id: req.params.id, isListed: true }).populate('category');
        
        if (!product) {
            return res.status(404).render('error', { message: 'Product not found or not available' });
        }

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        const productOffer = activeOffers.find(offer => 
            offer.type === 'product' && 
            offer.products.includes(product._id)
        );

        const categoryOffer = activeOffers.find(offer => 
            offer.type === 'category' && 
            offer.categories.includes(product.category._id)
        );

        let appliedOffer = null;
        let discountedPrice = product.productPrice;

        if (productOffer && (!categoryOffer || productOffer.discount > categoryOffer.discount)) {
            appliedOffer = productOffer;
            discountedPrice = product.productPrice * (1 - productOffer.discount / 100);
        } else if (categoryOffer) {
            appliedOffer = categoryOffer;
            discountedPrice = product.productPrice * (1 - categoryOffer.discount / 100);
        }

        const productWithOffer = {
            ...product.toObject(),
            discountedPrice: discountedPrice.toFixed(2),
            appliedOffer: appliedOffer
        };

        res.render('product', { product: productWithOffer, user });
    } catch (error) {
        console.error('Error in getProductDetails:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching product details' });
    }
};

const addToCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to add items to your cart' });
        }
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }
        const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity = parseInt(quantity, 10);
        } else {
            cart.items.push({ product: productId, quantity: parseInt(quantity, 10) });
        }
        await cart.save();

        res.json({ success: true, message: 'Product added to cart successfully' });
    } catch (error) {
        console.error(error);
    }
};

const loadCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login?message=' + encodeURIComponent('Please log in to view your cart'));
        }

        const userId = req.session.user._id;
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.render('cart', { user: req.session.user, cart: null });
        }

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        const cartWithOffers = cart.items.map(item => {
            let discountedPrice = item.product.productPrice;
            let appliedOffer = null;

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
                appliedOffer = productOffer;
            } else if (categoryOffer) {
                discountedPrice = item.product.productPrice * (1 - categoryOffer.discount / 100);
                appliedOffer = categoryOffer;
            }

            return {
                ...item.toObject(),
                discountedPrice: discountedPrice.toFixed(2),
                appliedOffer: appliedOffer
            };
        });

        res.render('cart', {
            user: req.session.user,
            cart: { items: cartWithOffers },
        });
    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).send('Server error');
    }
};

const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();

        res.json({ success: true, message: 'Item removed from cart successfully' });
    } catch (error) {
        console.error(error);
    }
};

const updateCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to update your cart' });
        }
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;
        if (quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const productPrice = product.productPrice;
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].totalAmount = (quantity * productPrice).toFixed(2);
        } else {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }
        await cart.save();

        let cartSubtotal = 0;
        cart.items.forEach(item => {
            cartSubtotal += parseFloat(item.totalAmount);
        });
        res.json({
            success: true,
            message: 'Cart updated successfully',
            subtotal: cartSubtotal.toFixed(2),
            total: cartSubtotal.toFixed(2)
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the cart' });
    }
};

const loadSearch = async (req, res) => {
    try {
        const query = req.query.q.toLowerCase();
        const products = await Product.find({
            $or: [
                { productTitle: { $regex: query, $options: "i" } },
                { productDescription: { $regex: query, $options: "i" } }
            ],
            isListed: true,
        }).limit(10);

        const results = products.map((product) => ({
            id: product._id,
            name: product.productTitle,
            description: product.productDescription,
            price: product.productPrice,
            discountedPrice: product.productDiscountedPrice,
            image: product.productImages[0],
        }));

        res.json(results);
    } catch (error) {
        console.error("Error in product search:", error);
        res.status(500).json({ error: "An error occurred while searching for products" });
    }
}
module.exports = {
    getProductDetails,
    getProducts,
    loadProductlist,
    loadCart,
    addToCart,
    removeFromCart,
    updateCart,
    loadSearch,
    
}