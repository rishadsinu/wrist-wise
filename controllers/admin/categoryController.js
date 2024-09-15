const Category = require('../../models/categoryModel');
const Admin = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../../models/userModel");
const path = require('path');
const fs = require('fs');


const loadcategorylist = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('categoryList', { categories });
    } catch (error) {
        console.error(error);
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

