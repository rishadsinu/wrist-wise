const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const Category = require('../models/categoryModel');

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

const loadProductlist = async (req, res) => {
    try {
        res.render('productList');
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
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
      const { name, slug, status  } = req.body;
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
      const { id, name, status ,slug} = req.body;
  
      // Check if category name is provided
      if (!name) {
        return res.status(400).json({ error: 'Category name is required.' });
      }
  
      // Update category
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
    addCategory,
    editCategory,
    logout
};