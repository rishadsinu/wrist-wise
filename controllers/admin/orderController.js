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
      const page = parseInt(req.query.page) || 1; 
      const limit = 10;

      const totalOrders = await Order.countDocuments();
      const totalPages = Math.ceil(totalOrders / limit); 

      const orders = await Order.find()
          .populate('userId')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

      const formattedOrders = orders.map(order => ({
          _id: order._id,
          orderId: order.orderId,
          createdAt: order.createdAt,
          status: order.items[0].order_status,
          userName: order.userId ? order.userId.name : 'Unknown User',
          cancelRequest: order.items.some(item => item.order_status === 'Cancellation Requested'),
          items: order.items
      }));

      res.render('ordersList', {
          orders: formattedOrders,
          currentPage: page,
          totalPages: totalPages,
          totalOrders: totalOrders
      });
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
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

const updateItemStatus = async (req, res) => {
    try {
      const { orderId, itemId } = req.params;
      const { status } = req.body;
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
  
      item.order_status = status;
      await order.save();
  
      res.json({ success: true, message: 'Item status updated successfully', updatedOrder: order });
    } catch (error) {
      console.error('Error updating item status:', error);
      res.status(500).json({ success: false, message: 'Failed to update item status', error: error.message });
    }
  };

const acceptCancellationRequest = async (req, res) => {
    try {
      const { orderId, itemId } = req.params;
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
  
      if (item.order_status !== 'Cancellation Requested') {
        return res.status(400).json({ success: false, message: 'Item is not in cancellation requested state' });
      }
  
      item.order_status = 'Cancelled';
      await order.save();
  
      res.json({ success: true, message: 'Item cancellation accepted successfully' });
    } catch (error) {
      console.error('Error accepting item cancellation:', error);
      res.status(500).json({ success: false, message: 'Failed to accept item cancellation.' });
    }
  };

module.exports = {
    loadOrdersList,
    getOrderDetails,
    updateItemStatus,
    acceptCancellationRequest,
    
}