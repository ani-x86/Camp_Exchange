import Product from '../models/Product.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

// ─── Browse & Read ────────────────────────────────────────────────────────────

export const getProducts = async (req, res, next) => {
  const { category, search, limit = 20, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = { status: 'available' };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  try {
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('sellerId', 'name prn');

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'sellerId',
      'name prn verificationStatus'
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

// ─── Create & Manage ──────────────────────────────────────────────────────────

export const createProduct = async (req, res, next) => {
  const { title, description, category, price, images } = req.body;

  if (!title || !description || !category || price === undefined) {
    return res.status(400).json({ error: 'Title, description, category, and price are required.' });
  }

  try {
    const product = await Product.create({
      sellerId: req.user.id,
      title,
      description,
      category,
      price: Number(price),
      images: Array.isArray(images) ? images : [],
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};

export const getMyProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user.id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized.' });
    }

    if (product.status === 'sold' || product.status === 'reserved') {
      return res.status(400).json({ error: 'Cannot delete a product that is sold or reserved.' });
    }

    // Optional: Delete images from Cloudinary to save space
    // Extract public_id from secure_url and call cloudinary.uploader.destroy()

    await product.deleteOne();
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};
