const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel')

const loadCategory = async (req, res) => {
  try {
    const { category, sort, priceSort, brand } = req.query;
    let matchStage = { isListed: true };
    let sortStage = {};

    if (category) {
      if (Array.isArray(category)) {
        matchStage.category = { $in: category };
      } else {
        matchStage.category = category;
      }
    }
    if (brand) {
      if (Array.isArray(brand)) {
        matchStage.brand = { $in: brand };
      } else {
        matchStage.brand = brand;
      }
    }
    if (sort === 'asc' || sort === 'desc') {
      sortStage = {
        $sort: {
          sortedTitle: sort === 'asc' ? 1 : -1
        }
      };
    } else if (priceSort === 'asc' || priceSort === 'desc') {
      sortStage = {
        $sort: {
          productDiscountedPrice: priceSort === 'asc' ? 1 : -1
        }
      };
    } else {
      sortStage = {
        $sort: { createdAt: -1 }
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          sortedTitle: {
            $toLower: {
              $replaceAll: {
                input: "$productTitle",
                find: " ",
                replacement: ""
              }
            }
          }
        }
      },
      sortStage,
      {
        $project: {
          sortedTitle: 0
        }
      }
    ];

    const products = await Product.aggregate(pipeline);
    const user = req.session.user;
    const categories = await Category.find({ status: 'active' });
    const brands = await Product.distinct('brand');

    res.render('category', {
      categories,
      user,
      products,
      brands,
      currentFilters: {
        category: Array.isArray(category) ? category : [category].filter(Boolean),
        brand: Array.isArray(brand) ? brand : [brand].filter(Boolean),
        sort,
        priceSort
      }
    });
  } catch (error) {
    console.error('Error loading user category list:', error);
    res.status(500).send('An error occurred while loading the category list');
  }
};


module.exports = {
  loadCategory
}