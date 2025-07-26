const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const User = require('../models/User');
const Round = require('../models/Round');
const Transaction = require('../models/Transaction');
const { getCrashPoint } = require('../services/fairness');
const { convertCryptoToUsd } = require('../services/priceFetcher');

// Helper to generate a mock transaction hash
function makeTxHash() {
  return crypto.randomBytes(16).toString('hex');
}

// POST /cashout where Body: { userId, roundNumber, currency, multiplier }
router.post('/', async (req, res) => {
  try {
    const { userId, roundNumber, currency, multiplier } = req.body;

    // Validate inputs
    if (!userId || !roundNumber || !currency || typeof multiplier !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid required fields.' });
    }
    if (multiplier <= 0) {
      return res.status(400).json({ error: 'Multiplier cannot be zero.' });
    }

    // Fetch the Round
    const round = await Round.findOne({ roundNumber });
    if (!round) {
      return res.status(404).json({ error: 'Round not found.' });
    }
    if (round.status !== 'in_progress') {
      return res.status(400).json({ error: 'Round not in progress.' });
    }

    // Determining the actual crash point
    const crashPoint = getCrashPoint(round.seed, roundNumber, 120);
    if (multiplier >= crashPoint) {
      return res.status(400).json({ 
        error: `Game crashed at ${crashPoint}×. Cannot cash out at ${multiplier}×.` 
      });
    }

    // Locate the bet transaction
    const betTx = await Transaction.findOne({
      player: userId,
      round: round._id,
      type: 'bet'
    });
    if (!betTx) {
      return res.status(404).json({ error: 'Bet not found for this round.' });
    }

    // Prevent double cashout trys
    const already = await Transaction.findOne({
      player: userId,
      round: round._id,
      type: 'cashout'
    });
    if (already) {
      return res.status(400).json({ error: 'Already cashed out for this round.' });
    }

    // Compute payout
    const payoutCrypto = betTx.cryptoAmount * multiplier;

    // Update the user wallet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const prevBal = user.wallet.get(currency) || 0;
    user.wallet.set(currency, prevBal + payoutCrypto);
    await user.save();

    // Log the cashout transaction
    const usdAmount = await convertCryptoToUsd(payoutCrypto, currency);
    const tx = await Transaction.create({
      player: userId,
      round: round._id,
      usdAmount,
      cryptoAmount: payoutCrypto,
      currency,
      type: 'cashout',
      transactionHash: makeTxHash(),
      priceAtTime: usdAmount / payoutCrypto
    });

    res.json({
      message: 'Cashed out successfully.',
      transaction: tx
    });

  } catch (err) {
    console.error('Error in POST /cashout:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;