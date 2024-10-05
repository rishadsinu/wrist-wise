const Admin = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../../models/userModel");
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel')
const path = require('path');
const fs = require('fs');
const multer = require('multer')

const loadProductlist = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const searchQuery = req.query.search || '';
  
      let query = {};
      if (searchQuery) {
        query = {
          $or: [
            { productTitle: { $regex: searchQuery, $options: 'i' } },
            { productDescription: { $regex: searchQuery, $options: 'i' } },
            { 'category.name': { $regex: searchQuery, $options: 'i' } }
          ]
        };
      }
  
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
  
      const products = await Product.find(query)
        .populate('category')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
  
      const categories = await Category.find();
  
      res.render('productList', {
        products,
        categories,
        currentPage: page,
        totalPages,
        totalProducts,
        searchQuery
      });
    } catch (error) {
      console.log(error);
      res.status(500).send('Server error');
    }
  };
const loadAddproduct = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('addProduct', { categories });
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
        stock: req.body.stock,
        category: req.body.category,
        isListed: req.body.isListed === 'true'
      };
  
      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
  
      let updatedImages = [...existingProduct.productImages];
  
      const imagePositions = req.body.imagePositions || [];
      const newImages = req.files || [];
      const newImagePositions = req.body.newImagePositions || [];
  
      newImages.forEach((file, index) => {
        const position = parseInt(newImagePositions[index]);
        if (!isNaN(position) && position >= 0 && position < 3) {
          updatedImages[position] = file.filename;
        }
      });
  
      for (let i = 0; i < 3; i++) {
        if (!updatedImages[i] && imagePositions[i]) {
          updatedImages[i] = imagePositions[i];
        }
      }
  
      updatedImages = updatedImages.filter(img => img != null).slice(0, 3);
  
      updateData.productImages = updatedImages;
      const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });
  
      if (!updatedProduct) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
  
      res.json({ success: true, product: updatedProduct });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  };
module.exports = {
    loadProductlist,
    loadAddproduct,
    addProduct,
    getProductDetails,
    updateProduct
}