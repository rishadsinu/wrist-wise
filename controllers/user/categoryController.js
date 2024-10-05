const User = require("../../models/userModel");
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel')
const mongoose = require('mongoose');
const Offer = require('../../models/offerModel')

const loadCategory = async (req, res) => {
    try {
        const { category, sort, priceSort, brand, page = 1 } = req.query;
        const limit = 9;
        const skip = (page - 1) * limit;

        const activeCategories = await Category.find({ status: 'active' });
        const activeCategoryIds = activeCategories.map(cat => cat._id);

        let filter = { isListed: true, category: { $in: activeCategoryIds } };

        if (category) {
            const categoryIds = Array.isArray(category) 
                ? category.map(cat => new mongoose.Types.ObjectId(cat))
                : [new mongoose.Types.ObjectId(category)];
            filter.category = { $in: categoryIds.filter(id => activeCategoryIds.some(activeId => activeId.equals(id))) };
        }
        if (brand) {
            filter.brand = Array.isArray(brand) ? { $in: brand } : brand;
        }
        const allProducts = await Product.find(filter).populate('category');

        const currentDate = new Date();
        const activeOffers = await Offer.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        const productsWithOffers = allProducts.map(product => {
            let discountedPrice = product.productPrice;
            let appliedOffer = null;

            const productOffer = activeOffers.find(offer => 
                offer.type === 'product' && 
                offer.products.includes(product._id)
            );

            const categoryOffer = activeOffers.find(offer => 
                offer.type === 'category' && 
                offer.categories.includes(product.category._id)
            );

            if (productOffer && (!categoryOffer || productOffer.discount > categoryOffer.discount)) {
                discountedPrice = product.productPrice * (1 - productOffer.discount / 100);
                appliedOffer = productOffer;
            } else if (categoryOffer) {
                discountedPrice = product.productPrice * (1 - categoryOffer.discount / 100);
                appliedOffer = categoryOffer;
            }

            return {
                ...product.toObject(),
                discountedPrice: parseFloat(discountedPrice.toFixed(2)),
                appliedOffer: appliedOffer
            };
        });

        if (sort === 'asc' || sort === 'desc') {
            productsWithOffers.sort((a, b) => {
                return sort === 'asc' 
                    ? a.productTitle.localeCompare(b.productTitle)
                    : b.productTitle.localeCompare(a.productTitle);
            });
        } else if (priceSort === 'asc' || priceSort === 'desc') {
            productsWithOffers.sort((a, b) => {
                return priceSort === 'asc' 
                    ? a.discountedPrice - b.discountedPrice
                    : b.discountedPrice - a.discountedPrice;
            });
        } else {
            productsWithOffers.sort((a, b) => b.createdAt - a.createdAt);
        }

        const totalProducts = productsWithOffers.length;
        const totalPages = Math.ceil(totalProducts / limit);
        const paginatedProducts = productsWithOffers.slice(skip, skip + limit);

        const brands = await Product.distinct('brand', { category: { $in: activeCategoryIds } });

        const categoryCounts = await Product.aggregate([
            { $match: { isListed: true, category: { $in: activeCategoryIds } } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const categoriesWithCounts = activeCategories.map(category => ({
            ...category.toObject(),
            productCount: categoryCounts.find(c => c._id.equals(category._id))?.count || 0
        }));

        res.render('category', {
            categories: categoriesWithCounts,
            user: req.session.user,
            products: paginatedProducts,
            brands,
            currentFilters: {
                category: Array.isArray(category) ? category : [category].filter(Boolean),
                brand: Array.isArray(brand) ? brand : [brand].filter(Boolean),
                sort,
                priceSort
            },
            currentPage: parseInt(page),
            totalPages: totalPages,
            queryParams: req.query
        });
    } catch (error) {
        console.error('Error loading user category list:', error);
        res.status(500).send('An error occurred while loading the category list');
    }
};
module.exports = {
  loadCategory
}