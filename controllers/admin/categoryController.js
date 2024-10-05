const Category = require('../../models/categoryModel');
const Admin = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../../models/userModel");
const path = require('path');
const fs = require('fs');

const loadcategorylist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const searchQuery = req.query.search || ''; 

        let query = {};
        if (searchQuery) {
            query = {
                name: { $regex: searchQuery, $options: 'i' } 
            };
        }
        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);

        const categories = await Category.find(query)
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('categoryList', {
            categories: categories,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: searchQuery 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, slug, status } = req.body;
        const existingCategory = await Category.findOne({ name: name });
        if (existingCategory) {
            return res.status(400).send('this name already exists');
        }
        const newCategory = new Category({ name, slug, status });
        await newCategory.save();
        res.redirect('/admin/categoryList');
    } catch (error) {
        console.error(error);
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
        console.error(error);
    }
};

module.exports = {
    loadcategorylist,
    editCategory,
    addCategory,
}

