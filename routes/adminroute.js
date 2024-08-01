const express = require('express');
adminRoute = express();

const path = require('path');
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');


adminRoute.set("view engine","ejs");
adminRoute.set('views','./views/admin');

adminRoute.get('/',adminController.loadLogin);
adminRoute.post('/adminlogin', adminController.loginAdmin);
adminRoute.get('/dashboard', adminAuth, adminController.loadDashboard);
adminRoute.get('/customers',adminController.loadCustomers);
adminRoute.get('/productlist',adminController.loadProductlist);
adminRoute.get('/logout', adminAuth, adminController.logout);

adminRoute.post('/user/block/:userId', adminController.blockUser);
adminRoute.post('/user/unblock/:userId', adminController.unblockUser);

adminRoute.get('/categorylist',adminController.loadcategorylist);

adminRoute.post('/add-category', adminController.addCategory);

adminRoute.post('/add-category', adminController.addCategory);
adminRoute.post('/edit-category', adminController.editCategory);

module.exports = adminRoute;