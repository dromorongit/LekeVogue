const express = require('express');
const router = express.Router();
const https = require('https');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Paystack secret key from environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// @route   POST /api/payments/initialize
// @desc    Initialize payment with Paystack
// @access  Public
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, customerDetails, cartItems } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Email and amount are required'
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const reference = `LV${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const postData = JSON.stringify({
      email: email,
      amount: Math.round(amount * 100), // Convert to kobo
      reference: reference,
      currency: 'GHS',
      callback_url: `${req.protocol}://${req.get('host')}/checkout.html?payment=success`,
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: customerDetails?.fullName || ''
          },
          {
            display_name: "Phone",
            variable_name: "customer_phone",
            value: customerDetails?.phone || ''
          }
        ]
      }
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = '';

      paystackRes.on('data', (chunk) => {
        data += chunk;
      });

      paystackRes.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.status) {
            res.json({
              success: true,
              message: 'Payment initialized',
              data: {
                authorizationUrl: response.data.authorization_url,
                accessCode: response.data.access_code,
                reference: response.data.reference
              }
            });
          } else {
            res.status(400).json({
              success: false,
              message: response.message || 'Failed to initialize payment'
            });
          }
        } catch (parseError) {
          console.error('Error parsing Paystack response:', parseError);
          res.status(500).json({
            success: false,
            message: 'Error processing payment initialization'
          });
        }
      });
    });

    paystackReq.on('error', (error) => {
      console.error('Paystack API error:', error);
      res.status(500).json({
        success: false,
        message: 'Error connecting to payment gateway'
      });
    });

    paystackReq.write(postData);
    paystackReq.end();

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during payment initialization'
    });
  }
});

// @route   POST /api/payments/verify
// @desc    Verify payment and create order
// @access  Public
router.post('/verify', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { reference, customerDetails, cartItems, subtotal, totalAmount } = req.body;

    if (!reference) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    // Check for duplicate order with same reference
    const existingOrder = await Order.findOne({ paymentReference: reference }).session(session);
    if (existingOrder) {
      await session.abortTransaction();
      return res.status(200).json({
        success: true,
        message: 'Order already exists',
        order: existingOrder,
        isDuplicate: true
      });
    }

    // Verify payment with Paystack API
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    };

    // Wait for Paystack verification
    const paystackVerified = await new Promise((resolve, reject) => {
      const paystackReq = https.request(options, (paystackRes) => {
        let data = '';

        paystackRes.on('data', (chunk) => {
          data += chunk;
        });

        paystackRes.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (parseError) {
            reject(parseError);
          }
        });
      });

      paystackReq.on('error', (error) => {
        reject(error);
      });

      paystackReq.end();
    });

    // Check if Paystack verification was successful
    if (!paystackVerified.status || paystackVerified.data.status !== 'success') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        paymentStatus: paystackVerified.data?.status || 'failed'
      });
    }

    // Verify amount matches
    const paidAmount = paystackVerified.data.amount / 100;
    if (totalAmount && Math.abs(paidAmount - totalAmount) > 1) {
      console.error(`Amount mismatch: expected ${totalAmount}, paid ${paidAmount}`);
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Amount mismatch detected'
      });
    }

    // Validate cart items
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'No items in cart'
      });
    }

    // Validate and deduct stock
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of cartItems) {
      const product = await Product.findById(item.id).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.id}`
        });
      }

      // Check variant-level stock if color/size specified
      let availableStock = 0;
      if (item.color && item.size && product.size_stock) {
        const colorStock = product.size_stock[item.color];
        if (colorStock) {
          availableStock = colorStock[item.size] || 0;
        }
      } else {
        availableStock = product.stock_quantity || 0;
      }

      const quantity = item.quantity || 1;
      if (availableStock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.product_name}${item.color ? ` (${item.color} ${item.size ? 'Size ' + item.size : ''})` : ''}. Available: ${availableStock}`
        });
      }

      // Calculate item price
      const unitPrice = product.sales_price || product.original_price;
      const lineTotal = unitPrice * quantity;
      calculatedTotal += lineTotal;

      // Deduct stock
      if (item.color && item.size && product.size_stock) {
        if (product.size_stock[item.color] && product.size_stock[item.color][item.size] !== undefined) {
          product.size_stock[item.color][item.size] -= quantity;
          if (product.size_stock[item.color][item.size] <= 0) {
            delete product.size_stock[item.color][item.size];
          }
        }
      }
      product.stock_quantity = Math.max(0, (product.stock_quantity || 0) - quantity);
      await product.save({ session });

      orderItems.push({
        productId: product._id,
        productName: product.product_name,
        selectedColor: item.color || null,
        selectedSize: item.size || null,
        quantity: quantity,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
        image: product.cover_image
      });
    }

    // Create order
    const order = new Order({
      customerFullName: customerDetails?.fullName || 'Customer',
      customerPhone: customerDetails?.phone || '',
      customerEmail: customerDetails?.email || '',
      deliveryRegion: customerDetails?.region || '',
      deliveryAddress: customerDetails?.address || '',
      orderItems: orderItems,
      subtotal: calculatedTotal,
      totalAmount: paidAmount,
      currency: 'GHS',
      paymentStatus: 'paid',
      orderStatus: 'new',
      paymentReference: reference,
      paystackTransactionId: paystackVerified.data.id?.toString(),
      paymentChannel: paystackVerified.data.channel,
      paidAt: new Date(paystackVerified.data.paid_at),
      customerNote: customerDetails?.notes || ''
    });

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: order
    });

  } catch (error) {
    // Abort transaction on any error
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error('Error aborting transaction:', abortError);
    }

    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying payment and creating order'
    });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/payments/verify/:reference
// @desc    Verify payment status by reference (legacy endpoint)
// @access  Public
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    // Check if order already exists
    const existingOrder = await Order.findOne({ paymentReference: reference });
    if (existingOrder) {
      return res.json({
        success: true,
        message: 'Order already exists',
        order: existingOrder
      });
    }

    // Verify with Paystack
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    };

    const paystackVerified = await new Promise((resolve, reject) => {
      const paystackReq = https.request(options, (paystackRes) => {
        let data = '';

        paystackRes.on('data', (chunk) => {
          data += chunk;
        });

        paystackRes.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (parseError) {
            reject(parseError);
          }
        });
      });

      paystackReq.on('error', (error) => {
        reject(error);
      });

      paystackReq.end();
    });

    if (paystackVerified.status && paystackVerified.data.status === 'success') {
      res.json({
        success: true,
        message: 'Payment verified',
        data: {
          reference: paystackVerified.data.reference,
          amount: paystackVerified.data.amount / 100,
          status: paystackVerified.data.status,
          paidAt: paystackVerified.data.paid_at
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not found or failed'
      });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

module.exports = router;
