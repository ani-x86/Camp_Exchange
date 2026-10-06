import crypto from 'crypto';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import razorpay from '../config/razorpay.js';
import { sendMail, receiptTemplate, sellerSaleTemplate } from '../config/mailer.js';

/**
 * POST /api/transactions/create
 * Creates a Razorpay Order and a pending Transaction in our DB.
 * Marks Product as 'reserved'.
 */
export const createOrder = async (req, res, next) => {
  const { productId, pickupLocation, pickupTimeWindow } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.status !== 'available') {
      return res.status(400).json({ error: 'Product is no longer available.' });
    }
    if (product.sellerId.toString() === req.user.id) {
      return res.status(400).json({ error: 'You cannot buy your own product.' });
    }

    // Create Razorpay order (amount is in paise)
    const options = {
      amount: Math.round(product.price * 100),
      currency: 'INR',
      receipt: `rcpt_${product._id}_${Date.now()}`,
    };
    
    const rzpOrder = await razorpay.orders.create(options);

    // Create pending transaction
    const transaction = await Transaction.create({
      productId: product._id,
      buyerId: req.user.id,
      sellerId: product.sellerId,
      amount: product.price,
      paymentStatus: 'created',
      razorpayOrderId: rzpOrder.id,
      pickupDetails: {
        location: pickupLocation || '',
        timeWindow: pickupTimeWindow || '',
      },
    });

    // Reserve product to prevent double bookings
    product.status = 'reserved';
    await product.save();

    res.status(201).json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      transactionId: transaction._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/transactions/webhook
 * Handles Razorpay webhook (payment.captured).
 * MUST be registered with express.raw() body parser, not JSON.
 */
export const webhookHandler = async (req, res, next) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  try {
    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body) // req.body must be raw Buffer
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString());

    // 2. Process payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const rzpOrderId = payment.order_id;

      const transaction = await Transaction.findOne({ razorpayOrderId: rzpOrderId });
      if (!transaction) {
        console.error('Webhook: Transaction not found for order', rzpOrderId);
        return res.status(200).send('OK'); // Acknowledge to stop retries
      }

      if (transaction.paymentStatus === 'paid') {
        return res.status(200).send('OK'); // Already processed
      }

      // 3. Fulfill transaction (RULES.MD RULE 1: ONLY PLACE WHERE paymentStatus = 'paid' HAPPENS)
      transaction.paymentStatus = 'paid';
      transaction.razorpayPaymentId = payment.id;
      await transaction.save();

      // 4. Update Product status
      const product = await Product.findById(transaction.productId);
      if (product) {
        product.status = 'sold';
        await product.save();
      }

      // 5. Send emails
      const buyer = await User.findById(transaction.buyerId);
      const seller = await User.findById(transaction.sellerId);

      if (buyer && seller && product) {
        await Promise.all([
          sendMail(buyer.collegeEmail, 'Your CampX Purchase Receipt', receiptTemplate({ transaction, product, seller })),
          sendMail(seller.collegeEmail, 'Your CampX Item Sold!', sellerSaleTemplate({ transaction, product, buyer })),
        ]);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook Error');
  }
};
