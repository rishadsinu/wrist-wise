const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fullName: { type: String, required: true },
    streetAddress: { type: String, required: true },
    apartmentNumber: { type: String },
    state: { type: String, required: true },
    city: { type: String, required: true },
    town: { type: String, required: true },
    pinCode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
});

module.exports = mongoose.model('Address', addressSchema);