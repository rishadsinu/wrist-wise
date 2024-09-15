const mongoose = require('mongoose');
const Category = require('../models/categoryModel')

const productSchema = new mongoose.Schema({
    productTitle: String,
    productDescription: String,
    productPrice: Number,
    productDiscountedPrice: Number,
    productImages: [String],
    stock: Number,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    isListed: Boolean
});

module.exports = mongoose.model('Product', productSchema);

// category: String,
