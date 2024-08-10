const express = require('express');
adminRoute = express(); 
const path = require('path');
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const fs = require('fs');

adminRoute.set("view engine","ejs");
adminRoute.set('views','./views/admin');

adminRoute.get('/',adminController.loadLogin);
adminRoute.post('/adminlogin', adminController.loginAdmin);
adminRoute.get('/dashboard', adminAuth, adminController.loadDashboard);

adminRoute.get('/productlist',adminAuth,adminController.loadProductlist);
adminRoute.get('/add-product',adminAuth,adminController.loadAddproduct);
adminRoute.get('/product/:id', adminAuth, adminController.getProductDetails);

// const uploadDir = path.join(__dirname, '../public/images');
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, uploadDir)
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname)
//     }
// });
const uploadDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
adminRoute.post('/submit-product', adminAuth, upload.array('productImages', 3), adminController.addProduct);
adminRoute.post('/update-product/:id', adminAuth, upload.array('productImages', 3), adminController.updateProduct);


adminRoute.get('/customers',adminController.loadCustomers);
adminRoute.post('/user/block/:userId', adminController.blockUser);
adminRoute.post('/user/unblock/:userId', adminController.unblockUser);

adminRoute.get('/categorylist',adminController.loadcategorylist);
adminRoute.post('/add-category', adminController.addCategory);
adminRoute.post('/edit-category', adminController.editCategory);

adminRoute.get('/logout', adminAuth, adminController.logout);

module.exports = adminRoute;