const express = require('express');
const router = express.Router();
const https = require('https');

// Paystack secret key from environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Verify payment with Paystack
router.post('/verify', async (req, res) => {
    try {
        const { reference } = req.body;
        
        if (!reference) {
            return res.status(400).json({
                success: false,
                message: 'Payment reference is required'
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
        
        const paystackReq = https.request(options, (paystackRes) => {
            let data = '';
            
            paystackRes.on('data', (chunk) => {
                data += chunk;
            });
            
            paystackRes.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (response.status && response.data.status === 'success') {
                        // Payment verified successfully
                        res.json({
                            success: true,
                            message: 'Payment verified successfully',
                            data: {
                                reference: response.data.reference,
                                amount: response.data.amount / 100, // Convert from kobo to GHS
                                email: response.data.customer.email,
                                status: response.data.status,
                                paidAt: response.data.paid_at
                            }
                        });
                    } else {
                        // Payment verification failed
                        res.status(400).json({
                            success: false,
                            message: 'Payment verification failed',
                            data: {
                                reference: response.data?.reference,
                                status: response.data?.status
                            }
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing Paystack response:', parseError);
                    res.status(500).json({
                        success: false,
                        message: 'Error processing payment verification'
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
        
        paystackReq.end();
        
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during payment verification'
        });
    }
});

// Initialize payment (optional - for server-side initialization)
router.post('/initialize', async (req, res) => {
    try {
        const { email, amount, reference } = req.body;
        
        if (!email || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Email and amount are required'
            });
        }
        
        const postData = JSON.stringify({
            email: email,
            amount: Math.round(amount * 100), // Convert to kobo
            reference: reference || `LV${Date.now()}`,
            currency: 'GHS'
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
                            message: 'Payment initialized successfully',
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

module.exports = router;
