const express = require('express');
const router = express.Router();

const User = require('../models/User');
const { convertCryptoToUsd } = require('../services/priceFetcher');

//Route checked GET /wallet?userId=<userId>
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Building a response with both the crypto balances and the USD equivalents
    const wallet = {};
    for (const [currency, amount] of user.wallet) {
      const usdValue = await convertCryptoToUsd(amount, currency);
      wallet[currency] = {
        cryptoAmount: amount,
        usdEquivalent: usdValue
      };
    }

    res.json({ userId, wallet });

  } catch (err) {
    console.error('Error in GET /wallet:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;