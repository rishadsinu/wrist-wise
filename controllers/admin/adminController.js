const Admin = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../../models/userModel");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const path = require('path');
const fs = require('fs');

const loadLogin = async (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        console.log(error);
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
    }
};

const loadDashboard = async (req, res) => {
    try {
        res.render('dashboard');
    } catch (error) {
        console.log(error);
    }
};

const loadCustomers = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ createdAt: -1 });
        res.render('usersList', { users: users });
    } catch (error) {
        console.error(error);
    }
};

const blockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: true }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User was blocked', user: user });
    } catch (error) {
        console.error(error);
    }
};

const unblockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: false }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User unblocked', user: user });
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
    loadLogin,
    loginAdmin,
    loadDashboard,
    loadCustomers,
    unblockUser,
    blockUser,
};