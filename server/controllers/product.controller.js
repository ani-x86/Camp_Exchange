import {
  listProducts,
  findProductById,
  createProduct as repoCreateProduct,
  findProductsBySeller,
  deleteProduct as repoDeleteProduct,
  updateProduct,
  incrementViewCount,
} from '../src/db/repositories/products.js';

// ─── Browse & Read ────────────────────────────────────────────────────────────

export const getProducts = async (req, res, next) => {
  const { category, search, limit = 20, page = 1 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const products = await listProducts({
      status: 'available',
      category: category && category !== 'all' ? category : undefined,
      search: search || undefined,
      limit: Number(limit),
      offset,
    });

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await findProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    // Increment view count asynchronously — don't block the response
    incrementViewCount(req.params.id).catch(() => {});
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

// ─── Create & Manage ──────────────────────────────────────────────────────────

export const createProduct = async (req, res, next) => {
  const { title, description, category, condition, price, images } = req.body;

  if (!title || !description || !category || price === undefined) {
    return res.status(400).json({ error: 'Title, description, category, and price are required.' });
  }

  try {
    const product = await repoCreateProduct({
      sellerId: req.user.id,
      title,
      description,
      category,
      condition,
      price: Number(price),
      images: Array.isArray(images) ? images : [],
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};
export const createProductHandler = createProduct;

export const getMyProducts = async (req, res, next) => {
  try {
    const products = await findProductsBySeller(req.user.id);
    res.json({ products });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    // Check existence and ownership first
    const product = await findProductById(req.params.id);
    if (!product || product.sellerId !== req.user.id) {
      return res.status(404).json({ error: 'Product not found or unauthorized.' });
    }

    if (product.status === 'sold' || product.status === 'reserved') {
      return res.status(400).json({ error: 'Cannot delete a product that is sold or reserved.' });
    }

    await repoDeleteProduct(req.params.id, req.user.id);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};
export const deleteProductHandler = deleteProduct;
