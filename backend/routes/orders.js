const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, authorize, requirePermission } = require('../middleware/auth');

// @route   GET /api/orders
// @desc    Get all orders
// @access  Protected (super_admin, order_manager)
router.get('/', protect, requirePermission('view_orders'), async (req, res) => {
  try {
    const { 
      search, 
      status, 
      paymentStatus, 
      sort = 'desc', 
      limit = 20, 
      page = 1 
    } = req.query;

    // Build query
    let query = {};

    // Filter by order status
    if (status) {
      query.orderStatus = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerFullName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { paymentReference: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (sort === 'asc') {
      sortOption = { createdAt: 1 };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .sort(sortOption)
      .limit(limitNum)
      .skip(skip)
      .populate('processedBy', 'fullName email');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// @route   GET /api/orders/stats
// @desc    Get order statistics
// @access  Protected (super_admin, order_manager)
router.get('/stats', protect, requirePermission('view_orders'), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const newOrders = await Order.countDocuments({ orderStatus: 'new' });
    const processingOrders = await Order.countDocuments({ orderStatus: 'processing' });
    const readyOrders = await Order.countDocuments({ orderStatus: 'ready_for_pickup' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'completed' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });
    
    const paidOrders = await Order.countDocuments({ paymentStatus: 'paid' });
    const pendingOrders = await Order.countDocuments({ paymentStatus: 'pending' });

    // Calculate total revenue from paid orders
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Orders by date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const ordersByDate = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        newOrders,
        processingOrders,
        readyOrders,
        completedOrders,
        cancelledOrders,
        paidOrders,
        pendingOrders,
        totalRevenue,
        ordersByDate
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Protected (super_admin, order_manager)
router.get('/:id', protect, requirePermission('view_single_order'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('processedBy', 'fullName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
// @access  Protected (super_admin, order_manager)
router.patch('/:id/status', protect, requirePermission('update_order_status'), async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const validStatuses = ['new', 'processing', 'ready_for_pickup', 'completed', 'cancelled'];
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = orderStatus;
    order.processedBy = req.user._id;
    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
});

// @route   PATCH /api/orders/:id/note
// @desc    Add internal note to order
// @access  Protected (super_admin, order_manager)
router.patch('/:id/note', protect, requirePermission('add_internal_order_note'), async (req, res) => {
  try {
    const { internalNote } = req.body;

    if (!internalNote) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Append note with timestamp
    const timestamp = new Date().toLocaleString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const noteEntry = `\n[${timestamp} - ${req.user.fullName}]: ${internalNote}`;
    
    order.internalNote = (order.internalNote || '') + noteEntry;
    order.processedBy = req.user._id;
    await order.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      order
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding note'
    });
  }
});

// @route   PATCH /api/orders/:id/acknowledge-pickup
// @desc    Mark pickup notice as acknowledged
// @access  Protected
router.patch('/:id/acknowledge-pickup', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.pickupNoticeAcknowledged = true;
    await order.save();

    res.json({
      success: true,
      message: 'Pickup notice acknowledged',
      order
    });
  } catch (error) {
    console.error('Acknowledge pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging pickup'
    });
  }
});

module.exports = router;