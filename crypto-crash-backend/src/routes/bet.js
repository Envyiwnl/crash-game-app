const express = require("express");
const router = express.Router();
const { convertUsdToCrypto } = require("../services/priceFetcher");
const Round = require("../models/Round");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getCrashPoint, initRoundSeed } = require("../services/fairness");
const crypto = require("crypto");

// Helper to generate a mock transaction hash
function makeTxHash() {
  return crypto.randomBytes(16).toString("hex");
}

// POST /bet where Body: { userId, roundNumber, usdAmount, currency }
router.post("/", async (req, res) => {
  try {
    const { userId, roundNumber, usdAmount, currency } = req.body;

    // Validate inputs
    if (!userId || !roundNumber || !usdAmount || !currency) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (usdAmount <= 0) {
      return res.status(400).json({ error: "Bet amount cannot be 0." });
    }

    // Fetch or create the Round
    let round = await Round.findOne({ roundNumber });
    if (!round) {
      // Initialize provably fair seed for a new round
      const { seed, seedHash } = initRoundSeed(roundNumber, 120);
      round = await Round.create({ roundNumber, seed, hash: seedHash });
    }
    if (round.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Betting is closed for this round." });
    }

    // Prevent multiple bets per user per round
    const existingBet = await Transaction.findOne({
      player: userId,
      round: round._id,
      type: "bet",
    });
    if (existingBet) {
      return res
        .status(400)
        .json({ error: "You have already placed a bet this round." });
    }

    // Convert USD to crypto and deduct from user wallet
    const cryptoAmount = await convertUsdToCrypto(usdAmount, currency);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const balance = user.wallet.get(currency) || 0;
    if (balance < cryptoAmount) {
      return res.status(400).json({ error: "Insufficient wallet balance." });
    }
    user.wallet.set(currency, balance - cryptoAmount);
    await user.save();

    // Log transaction
    const tx = await Transaction.create({
      player: userId,
      round: round._id,
      usdAmount,
      cryptoAmount,
      currency,
      type: "bet",
      transactionHash: makeTxHash(),
      priceAtTime: usdAmount / cryptoAmount,
    });

    // Respond with round info and transaction details
    res.json({
      message: "Bet placed successfully.",
      round: {
        id: round._id,
        roundNumber: round.roundNumber,
        hash: round.hash,
        status: round.status,
      },
      transaction: tx,
    });
  } catch (err) {
    console.error("Error in POST /bet:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
