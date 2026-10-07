import crypto from 'crypto';
import {
  createTransaction, findTransactionByOrderId, markTransactionPaid,
  setReceiptSent,
} from '../src/db/repositories/transactions.js';
import { findProductById } from '../src/db/repositories/products.js';
import { findUserById } from '../src/db/repositories/users.js';
import razorpay from '../config/razorpay.js';
import { sendMail, receiptTemplate, sellerSaleTemplate } from '../config/mailer.js';

/**
 * POST /api/transactions/create
 * Creates a Razorpay Order and a pending Transaction in our DB.
 * Reserves the product.
 */
export const createOrder = async (req, res, next) => {
  const { productId, pickupLocation, pickupTimeWindow } = req.body;

  try {
    const product = await findProductById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.status !== 'available') {
      return res.status(400).json({ error: 'Product is no longer available.' });
    }
    if (product.sellerId === req.user.id) {
      return res.status(400).json({ error: 'You cannot buy your own product.' });
    }

    // Create Razorpay order (amount is in paise)
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(product.price * 100),
      currency: 'INR',
      receipt: `rcpt_${product.id}_${Date.now()}`,
    });

    // Snapshot the primary image URL at checkout time
    const productImageUrl = product.images?.[0]?.url || '';

    const transaction = await createTransaction({
      productId: product.id,
      buyerId: req.user.id,
      sellerId: product.sellerId,
      amount: product.price,
      productTitle: product.title,
      productImageUrl,
      razorpayOrderId: rzpOrder.id,
      pickupLocation: pickupLocation || null,
      pickupTimeWindow: pickupTimeWindow || null,
    });

    // Reserve product
    const pool = (await import('../src/db/pool.js')).getPool();
    await pool.query(
      "UPDATE products SET status = 'reserved', reserved_for = $1 WHERE id = $2",
      [req.user.id, product.id]
    );

    res.status(201).json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      transactionId: transaction.id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/transactions/webhook
 * Handles Razorpay webhook (payment.captured).
 * MUST be registered with express.raw() body parser.
 *
 * RULES.MD RULE 1: This is the ONLY place where payment_status = 'paid' happens.
 */
export const webhookHandler = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  try {
    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString());

    // 2. Process payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const rzpOrderId = payment.order_id;

      try {
        // markTransactionPaid is idempotent and atomically updates the product too
        const { transaction, productId } = await markTransactionPaid(
          rzpOrderId,
          payment.id
        );

        // 3. Send emails (non-blocking — webhook response must be fast)
        if (productId) {
          setEmails(transaction, productId).catch((e) =>
            console.error('[Webhook] Email error:', e.message)
          );
        }
      } catch (err) {
        console.error('Webhook payment processing error:', err.message);
        // Still return 200 to prevent Razorpay retry loops for business-logic errors
        if (err.status === 404) {
          console.error('Webhook: Transaction not found for order', rzpOrderId);
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook Error');
  }
};

async function setEmails(transaction, productId) {
  const [product, buyer, seller] = await Promise.all([
    findProductById(productId),
    findUserById(transaction.buyerId),
    findUserById(transaction.sellerId),
  ]);

  if (buyer && seller) {
    await Promise.all([
      sendMail(
        buyer.collegeEmail,
        'Your CampX Purchase Receipt',
        receiptTemplate({ transaction, product, seller })
      ),
      sendMail(
        seller.collegeEmail,
        'Your CampX Item Sold!',
        sellerSaleTemplate({ transaction, product, buyer })
      ),
    ]);
    await setReceiptSent(transaction.id);
  }
}
