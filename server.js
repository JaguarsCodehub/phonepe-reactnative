const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Replace with your actual PhonePe merchantId, xVerifyKey (salt key), and endpoint
const merchantId = 'PGTESTPAYUAT';
const xVerifyKey = '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'; // Salt key
const saltIndex = '1'; // Replace with the actual salt index
const endpoint = '/v3/merchant/otp/send'; // Replace with the actual endpoint used in the token generation

app.post('/create-payment', async (req, res) => {
    const { amount, merchantTransactionId, merchantUserId, redirectUrl } = req.body;

    const requestData = {
        merchantId,
        merchantTransactionId,
        merchantUserId,
        amount,
        redirectUrl,
    };

    const requestString = JSON.stringify(requestData);
    const base64Payload = Buffer.from(requestString).toString('base64');
    const concatenatedString = base64Payload + endpoint + xVerifyKey;
    const checksum = crypto.createHmac('sha256', xVerifyKey)
        .update(concatenatedString)
        .digest('hex');

    const xVerifyToken = `${checksum}###${saltIndex}`;

    console.log('Request Data:', requestData);
    console.log('Base64 Payload:', base64Payload);
    console.log('Concatenated String:', concatenatedString);
    console.log('Generated Checksum:', checksum);
    console.log('X-VERIFY Token:', xVerifyToken);

    try {
        const response = await axios.post('https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay', requestData, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerifyToken,
            }
        });

        console.log('PhonePe API response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error creating payment:', error.response ? error.response.data : error.message);
        res.status(500).send('Error creating payment');
    }
});

app.post('/payment-response', (req, res) => {
    const { data, responseSignature } = req.body;

    // Verify the response signature
    const expectedSignature = crypto.createHmac('sha256', xVerifyKey)
        .update(data)
        .digest('hex');

    if (responseSignature !== expectedSignature) {
        return res.status(400).send('Invalid response signature');
    }

    // Process the payment response data
    // Update payment status in your system

    res.send('Payment processed');
});

app.post('/verify-payment', async (req, res) => {
    const { merchantTransactionId } = req.body;

    const requestData = {
        merchantId,
        merchantTransactionId,
    };

    const requestString = JSON.stringify(requestData);
    const base64Payload = Buffer.from(requestString).toString('base64');
    const concatenatedString = base64Payload + endpoint + xVerifyKey;
    const checksum = crypto.createHmac('sha256', xVerifyKey)
        .update(concatenatedString)
        .digest('hex');

    const xVerifyToken = `${checksum}###${saltIndex}`;

    console.log('Request Data:', requestData);
    console.log('Base64 Payload:', base64Payload);
    console.log('Concatenated String:', concatenatedString);
    console.log('Generated Checksum:', checksum);
    console.log('X-VERIFY Token:', xVerifyToken);

    try {
        const response = await axios.get(`https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/payments/${merchantTransactionId}/status`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerifyToken,
            }
        });

        console.log('PhonePe API verification response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error verifying payment:', error.response ? error.response.data : error.message);
        res.status(500).send('Error verifying payment');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
