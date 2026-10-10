import { Readable } from 'node:stream';
import cloudinary from '../config/cloudinary.js';
import {
  listProducts,
  findProductById,
  createProduct as repoCreateProduct,
  findProductsBySeller,
  deleteProduct as repoDeleteProduct,
  updateProduct,
  incrementViewCount,
} from '../src/db/repositories/products.js';

const CATEGORY_VALUES = new Map([
  ['books', 'books'],
  ['electronics', 'electronics'],
  ['lab equipment', 'lab-equipment'],
  ['lab-equipment', 'lab-equipment'],
  ['stationery', 'stationery'],
  ['furniture', 'furniture'],
  ['clothing', 'clothing'],
  ['sports', 'sports'],
  ['other', 'other'],
]);

const CONDITION_VALUES = new Map([
  ['new', 'new'],
  ['like new', 'like-new'],
  ['like-new', 'like-new'],
  ['good', 'good'],
  ['fair', 'fair'],
]);

function uploadImageBuffer(file) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_PRODUCT_FOLDER || 'campx/products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          const uploadError = new Error('Image upload to Cloudinary failed.');
          uploadError.status = 502;
          uploadError.code = error.http_code || error.code;
          reject(uploadError);
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(Object.assign(
            new Error('Cloudinary did not return a usable image URL.'),
            { status: 502 }
          ));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    Readable.from([file.buffer]).pipe(upload);
  });
}

async function removeUploadedImages(images) {
  const results = await Promise.allSettled(
    images.map((image) => cloudinary.uploader.destroy(image.publicId))
  );
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed) {
    console.error(`[Products] Failed to clean up ${failed} orphaned Cloudinary image(s).`);
  }
}

function validateListingFields({ title, description, category, condition, price }) {
  if (
    typeof title !== 'string' || !title.trim()
    || typeof description !== 'string' || !description.trim()
    || typeof category !== 'string' || !category.trim()
    || (typeof price !== 'string' && typeof price !== 'number')
    || (typeof price === 'string' && !price.trim())
  ) {
    return 'Item title, category, price, and description are required.';
  }

  if (title.trim().length < 3 || title.trim().length > 80) {
    return 'Item title must be between 3 and 80 characters.';
  }
  if (description.trim().length < 10 || description.trim().length > 500) {
    return 'Description must be between 10 and 500 characters.';
  }
  if (!CATEGORY_VALUES.has(category.trim().toLowerCase())) {
    return 'Select a valid product category.';
  }
  const priceValue = String(price).trim();
  if (!/^[0-9]+$/.test(priceValue)) {
    return 'Price must be a whole number between 1 and 100000.';
  }
  const numericPrice = Number(priceValue);
  if (!Number.isSafeInteger(numericPrice) || numericPrice < 1 || numericPrice > 100000) {
    return 'Price must be a whole number between 1 and 100000.';
  }
  if (
    condition !== undefined
    && condition !== ''
    && (typeof condition !== 'string' || !CONDITION_VALUES.has(condition.trim().toLowerCase()))
  ) {
    return 'Select a valid product condition.';
  }
  return null;
}

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
  const { itemTitle, title, description, category, condition, price } = req.body;
  const normalizedTitle = itemTitle ?? title;
  const fieldError = validateListingFields({
    title: normalizedTitle,
    description,
    category,
    condition,
    price,
  });
  if (fieldError) {
    return res.status(400).json({ error: fieldError });
  }

  const suppliedImages = Array.isArray(req.files) && req.files.length
    ? null
    : Array.isArray(req.body.images)
      ? req.body.images
      : [];
  if (!req.files?.length && !suppliedImages.length) {
    return res.status(400).json({ error: 'At least one product image is required.' });
  }

  const uploadedImages = [];
  try {
    if (req.files?.length) {
      for (const file of req.files) {
        uploadedImages.push(await uploadImageBuffer(file));
      }
    }

    const product = await repoCreateProduct({
      sellerId: req.user.id,
      title: normalizedTitle.trim(),
      description: description.trim(),
      category: CATEGORY_VALUES.get(category.trim().toLowerCase()),
      condition: condition
        ? CONDITION_VALUES.get(condition.trim().toLowerCase())
        : null,
      price: Number(price),
      images: req.files?.length ? uploadedImages : suppliedImages,
    });

    res.status(201).json({ product });
  } catch (err) {
    if (uploadedImages.length) {
      await removeUploadedImages(uploadedImages);
    }
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
