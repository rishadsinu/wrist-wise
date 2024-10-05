const Offer = require('../../models/offerModel')
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');

const loadOffers = async (req, res) => {
  try {
    const offers = await Offer.find().populate('products categories');
    const products = await Product.find({}, 'productTitle');
    const categories = await Category.find({}, 'name');

    res.render('offers', { offers, products, categories });
  } catch (error) {
    console.error(error);
  }
};

const addOffer = async (req, res) => {
  try {
    const { offerName, discount, type, startDate, endDate, products, categories, status } = req.body;

    const newOffer = new Offer({
      offerName,
      discount,
      type,
      startDate,
      endDate,
      products: type === 'product' ? products : [],
      categories: type === 'category' ? categories : [],
      status: status === 'true'
    });

    await newOffer.save();

    const populatedOffer = await Offer.findById(newOffer._id).populate('products categories');

    res.status(201).json({ success: true, offer: populatedOffer });
  } catch (error) {
    console.error('Error in addOffer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const result = await Offer.findByIdAndDelete(offerId);

    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Offer not found' });
    }
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ success: false, error: 'Failed to delete offer', details: error.message });
  }
}

const getOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('products')
      .populate('categories');

    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    let allItems;
    if (offer.type === 'product') {
      allItems = await Product.find();
    } else if (offer.type === 'category') {
      allItems = await Category.find();
    }

    const populatedOffer = {
      ...offer.toObject(),
      [offer.type === 'product' ? 'products' : 'categories']: allItems.map(item => ({
        ...item.toObject(),
        selected: offer[offer.type === 'product' ? 'products' : 'categories']
          .some(i => i._id.toString() === item._id.toString())
      }))
    };

    res.json({ success: true, offer: populatedOffer });
  } catch (error) {
    console.error('Error in getOffer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateOffer = async (req, res) => {
  try {
    const { offerId, offerName, discount, type, startDate, endDate, products, categories, status } = req.body;

    const updatedOffer = {
      offerName,
      discount,
      type,
      startDate,
      endDate,
      products: type === 'product' ? products : [],
      categories: type === 'category' ? categories : [],
      status: status === 'true'
    };

    const offer = await Offer.findByIdAndUpdate(offerId, updatedOffer, { new: true })
      .populate('products')
      .populate('categories');

    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    res.json({ success: true, offer });
  } catch (error) {
    console.error('Error in updateOffer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  loadOffers,
  addOffer,
  deleteOffer,
  getOffer,
  updateOffer
};

