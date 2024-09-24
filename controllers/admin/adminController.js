const Admin = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../../models/userModel");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const path = require('path');
const fs = require('fs');
const Order = require('../../models/orderModel')
const PDFDocument = require('pdfkit');
const stream = require('stream');

const loadLogin = async (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        console.log(error);
    }
};

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (admin && await bcrypt.compare(password, admin.password)) {
            req.session.admin = admin;
            res.redirect('/admin/dashboard');
        } else {
            res.render('adminLogin', { message: 'Invalid email or password' });
        }
    } catch (error) {
        console.log(error);
    }
};

const loadDashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .populate('userId')
            .populate('items.product')
            .sort({ createdAt: -1 });

        const formattedData = formatOrders(orders);

        res.render('dashboard', {
            orders: formattedData.orders,
            totalSales: formattedData.totalSales,
            totalDiscount: formattedData.totalDiscount,
            startDate: startDate || '',
            endDate: endDate || ''
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
};
const downloadPDFReport = async (req, res) => {
    try {
        const { startDate, endDate, filter } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (filter) {
            const now = new Date();
            switch (filter) {
                case 'today':
                    query.createdAt = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'thisWeek':
                    query.createdAt = {
                        $gte: new Date(now.setDate(now.getDate() - now.getDay())),
                        $lte: new Date(now.setDate(now.getDate() - now.getDay() + 6))
                    };
                    break;
                case 'thisMonth':
                    query.createdAt = {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    };
                    break;
                case 'thisYear':
                    query.createdAt = {
                        $gte: new Date(now.getFullYear(), 0, 1),
                        $lte: new Date(now.getFullYear(), 11, 31)
                    };
                    break;
            }
        }

        const orders = await Order.find(query)
        .populate('userId')
        .populate('items.product')
        .sort({ createdAt: -1 });

    const formattedData = formatOrders(orders);

    const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).font('Helvetica');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
    
    let filterText = 'All Time';
    if (startDate && endDate) {
        filterText = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    } else if (filter) {
        filterText = filter.charAt(0).toUpperCase() + filter.slice(1);
    }
    doc.text(`Filter: ${filterText}`, { align: 'left' });
    doc.moveDown();

    doc.text(`Total Sales: ₹${formattedData.totalSales}`, { align: 'left' });
    doc.text(`Total Discount: ₹${formattedData.totalDiscount}`, { align: 'left' });
    doc.moveDown();

    const table = {
        headers: ['Date', 'Username', 'Payment', 'Qty', 'Original', 'Discount', 'Final'],
        rows: formattedData.orders.map(order => [
            order.date,
            order.username,
            order.paymentMethod,
            order.quantity.toString(),
            `₹${order.originalTotal}`,
            `₹${order.discountedPrice}`,
            `₹${order.finalTotal}`
        ])
    };

    const startX = 50;
    const startY = doc.y + 10;
    const columnWidth = (doc.page.width - 100) / table.headers.length;
    const rowHeight = 20;

    function drawTableCell(x, y, width, height, text, isHeader = false) {
        doc.rect(x, y, width, height).stroke();
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        doc.text(text, x + 2, y + 5, { width: width - 4, align: 'left' });
    }

    table.headers.forEach((header, i) => {
        drawTableCell(startX + i * columnWidth, startY, columnWidth, rowHeight, header, true);
    });
    let currentY = startY + rowHeight;
    table.rows.forEach((row) => {
        if (currentY + rowHeight > doc.page.height - 50) {
            doc.addPage();
            currentY = 50;
            table.headers.forEach((header, i) => {
                drawTableCell(startX + i * columnWidth, currentY, columnWidth, rowHeight, header, true);
            });
            currentY += rowHeight;
        }

        row.forEach((cell, i) => {
            drawTableCell(startX + i * columnWidth, currentY, columnWidth, rowHeight, cell);
        });
        currentY += rowHeight;
    });
    let pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.text(`Page ${i + 1} of ${pages.count}`, 
            0, doc.page.height - 30, 
            { align: 'center', width: doc.page.width }
        );
    }
    doc.end();

} catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).send('Error generating PDF report');
}
};

const formatOrders = (orders) => {
    let totalSales = 0;
    let totalDiscount = 0;

    const formattedOrders = orders.map(order => {
        const quantity = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        const originalTotal = order.items.reduce((sum, item) => {
            return sum + (item.product.productPrice * item.quantity);
        }, 0);

        const finalTotal = order.totalPrice || 0;
        const discountedPrice = originalTotal - finalTotal;

        totalSales += finalTotal;
        totalDiscount += discountedPrice;

        return {
            orderId: order.orderId || 'N/A',
            date: order.createdAt ? order.createdAt.toISOString().split('T')[0] : 'N/A',
            username: order.userId ? order.userId.name : 'Unknown User',
            paymentMethod: order.paymentMethod || 'N/A',
            quantity: quantity,
            originalTotal: originalTotal.toFixed(2),
            discountedPrice: discountedPrice.toFixed(2),
            finalTotal: finalTotal.toFixed(2)
        };
    });

    return {
        orders: formattedOrders,
        totalSales: totalSales.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2)
    };
};
const getFilteredOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .populate('userId')
            .populate('items.product')
            .sort({ createdAt: -1 });

        const formattedData = formatOrders(orders);

        res.json(formattedData);
    } catch (error) {
        console.error('Error getting filtered orders:', error);
        res.status(500).json({ error: 'Error getting filtered orders' });
    }
};

const getQuickFilteredOrders = async (req, res) => {
    try {
        const { filter } = req.query;
        let startDate, endDate;

        const now = new Date();
        switch (filter) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'thisWeek':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                endDate = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                break;
            case 'thisMonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'thisYear':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return res.status(400).json({ error: 'Invalid filter' });
        }

        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        })
        .populate('userId')
        .populate('items.product')
        .sort({ createdAt: -1 });

        const formattedOrders = formatOrders(orders);

        res.json(formattedOrders);
    } catch (error) {
        console.error('Error getting quick filtered orders:', error);
        res.status(500).json({ error: 'Error getting quick filtered orders' });
    }
};

const loadCustomers = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ createdAt: -1 });
        res.render('usersList', { users: users });
    } catch (error) {
        console.error(error);
    }
};

const blockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: true }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User was blocked', user: user });
    } catch (error) {
        console.error(error);
    }
};

const unblockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: false }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User unblocked', user: user });
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
    loadLogin,
    loginAdmin,
    loadDashboard,
    loadCustomers,
    unblockUser,
    blockUser,
    getFilteredOrders,
    getQuickFilteredOrders,
    downloadPDFReport
};