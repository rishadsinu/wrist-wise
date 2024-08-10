const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productTitle: String,
    productDescription: String,
    productPrice: Number,
    productDiscountedPrice: Number,
    productImages: [String],
    stock: Number,
    category: String,
    isListed: Boolean
});

module.exports = mongoose.model('Product', productSchema);
