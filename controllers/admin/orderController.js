const Admin = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../../models/userModel");
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Order = require('../../models/orderModel');
const path = require('path');
const fs = require('fs');

const loadOrdersList = async (req, res) => {
    try {
        const orders = await Order.find().populate('userId').sort({ createdAt: -1 });
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            createdAt: order.createdAt,
            status: order.items[0].order_status, 
            userName: order.userId.name,
            cancelRequest: order.items.some(item => item.order_status === 'Cancellation Requested'),
            items: order.items 
        }));

        res.render('ordersList', { orders: formattedOrders });
    } catch (error) {
        console.error('Error loading orders list:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ success: false, message: 'Failed to get order details' });
    }
};

const updateOrderStatus = async (req, res) => {

    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const result = await Order.updateOne(
            { _id: orderId },
            { $set: { "items.$[].order_status": status } }
        );
        if (result.nModified > 0) {
            const updatedOrder = await Order.findById(orderId);
            res.json({ success: true, message: 'Order status updated successfully', updatedOrder });
        } else {
            res.status(404).json({ success: false, message: 'Order status not updated or order not found' });
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
    }
};

const acceptCancellationRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.items[0].order_status = 'Cancelled'; 
        order.cancelRequest = false; 

        await order.save();

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error accepting cancel request:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel the order.' });
    }
};

const rejectCancellationRequest =  async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.cancelRequest = false; 

        await order.save();

        res.json({ success: true, message: 'Cancel request rejected successfully' });
    } catch (error) {
        console.error('Error rejecting cancel request:', error);
        res.status(500).json({ success: false, message: 'Failed to reject the cancel request.' });
    }
}


module.exports = {
    loadOrdersList,
    getOrderDetails,
    updateOrderStatus,
    acceptCancellationRequest,
    rejectCancellationRequest
}