const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const path = require('path');
const fs = require('fs');


const loadLogin = async (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};


const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (admin && await bcrypt.compare(password, admin.password)) {
            req.session.admin = admin;
            res.redirect('/admin/dashboard');
        } else {
            res.render('adminLogin', { message: 'Invalid email or password' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};

const loadDashboard = async (req, res) => {
    try {
        res.render('dashboard');
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};

const loadCustomers = async (req, res) => {
    try {
        const users = await User.find({}, 'name email phone isBlocked')
            .sort({ createdAt: -1 });
        res.render('usersList', { users: users });
    } catch (error) {
        console.error('Error in loadCustomers:', error);
        res.status(500).send('Server error');
    }
};
// Block user function
const blockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: true }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User blocked successfully', user: user });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Unblock user function

const unblockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: false }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User unblocked successfully', user: user });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// const loadProductlist = async (req, res) => {
//     try {
//         const products = await Product.find().sort({ createdAt: -1 }); // Sort by creation date, newest first
//         res.render('productList', { products });
//     } catch (error) {
//         console.log(error);
//         res.status(500).send('Server error');
//     }
// };
const loadProductlist = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }); // Sort by creation date, newest first
        const categories = await Category.find(); // Fetch categories from the database
        res.render('productList', { products, categories }); // Pass both products and categories to the view
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};
const loadAddproduct = async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render('addProduct',{categories});
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};


const addProduct = async (req, res) => {
    try {
        const images = req.files.map(file => file.filename);
        const newProduct = new Product({
            productTitle: req.body.productTitle,
            productDescription: req.body.productDescription,
            productPrice: req.body.productPrice,
            productDiscountedPrice: req.body.productDiscountedPrice,
            productImages: images,
            stock: req.body.stock,
            category: req.body.category,
            isListed: req.body.isListed === 'true'
        });
        await newProduct.save();
        res.redirect('/admin/productlist');
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};

const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });
    }
};


const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = {
            productTitle: req.body.productTitle,
            productDescription: req.body.productDescription,
            productPrice: req.body.productPrice,
            productDiscountedPrice: req.body.productDiscountedPrice,
            stock: req.body.stock,
            category: req.body.category,
            isListed: req.body.isListed === 'true'
        };

        const existingProduct = await Product.findById(productId);

        if (!existingProduct) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        let updatedImages = existingProduct.productImages;

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);

            // Combine new images with existing ones, keeping a maximum of 3 images
            updatedImages = [...newImages, ...existingProduct.productImages].slice(0, 3);

        }

        updateData.productImages = updatedImages;

        const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, product: updatedProduct });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};


const loadcategorylist = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('categoryList', { categories });
    } catch (error) {
        console.error('Error loading category list:', error);
        res.status(500).send('An error occurred while loading the category list');
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, slug, status } = req.body;
        const existingCategory = await Category.findOne({ name: name });
        if (existingCategory) {
            return res.status(400).send('A category with this name already exists');
        }
        const newCategory = new Category({ name, slug, status });
        await newCategory.save();
        res.redirect('/admin/categoryList');
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).send('An error occurred while adding the category');
    }
};

const editCategory = async (req, res) => {
    try {
        const { id, name, status, slug } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required.' });
        }

        await Category.findByIdAndUpdate(id, {
            name,
            slug,
            status,
        });

        res.redirect('/admin/categoryList');
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).json({ error: 'Server error while editing category.' });
    }
};

const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/admin');
    });
};


module.exports = {
    loadLogin,
    loginAdmin,
    loadDashboard,
    loadCustomers,
    unblockUser,
    blockUser,
    loadcategorylist,
    loadProductlist,
    loadAddproduct,
    addProduct,
    getProductDetails,
    updateProduct,
    addCategory,
    editCategory,
    logout
};