const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        addressName: {
            type: String,
            required: true
        },
        addressEmail: {
            type: String,
            required: true
        },
        addressMobile: {
            type: String,
            required: true
        },
        addressHouse: {
            type: String,
            required: true
        },
        addressStreet: {
            type: String,
            required: true
        },
        addressPost: {
            type: String,
            required: true
        },
        addressCity: {
            type: String,
            required: true
        },
      
        addressState: {
            type: String,
            required: true
        },
        addressPin: {
            type: Number,
            required: true
        }
    },
    paymentMethod: {
        type: String,
        required: true,
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
            order_status: {
                type: String,
                enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested",'Return Accepted','Cancellation Requested' ],
                default: "Pending",

            },
            originalStatus: String, 
            price: {
                type: Number,
                required: true
            },
            cancelReason: {
                type: String,
                default: '',
            },
            returnReason: {
                type: String,
                default: ''
            }
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    deliveryDate: {
        type: Date,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    payment_status: {
        type: String,
        enum: ["Pending", "Completed", "Failed"],
        default: "Pending",
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
    },
    couponDiscountAmt: {
        type: Number,
        default: 0,
    },
    productImages: [
        {
            type: String // Store image paths or URLs
        }
    ],
    orderId: {
        type: String,
        unique: true,
        required: true,
    },
});

module.exports = mongoose.model('Order', orderSchema);

