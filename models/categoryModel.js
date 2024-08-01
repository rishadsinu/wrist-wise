const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    productCount: {
        type: Number,
        default: 0
    },
    slug: {
        type: String,
        unique: true
    }
});

module.exports = mongoose.model('Category', categorySchema);

