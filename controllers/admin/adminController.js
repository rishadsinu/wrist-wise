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
    logout
};