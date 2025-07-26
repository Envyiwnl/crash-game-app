
const crypto = require('crypto');
const Round = require('../models/Round');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { initRoundSeed, getCrashPoint } = require('../services/fairness');
const { convertCryptoToUsd } = require('../services/priceFetcher');

// Timing constants
const TOTAL_ROUND_MS    = 30_000; // full cycle
const BET_WINDOW_MS     = 10_000; // first 10s where bets open
const PLAY_WINDOW_MS    = TOTAL_ROUND_MS - BET_WINDOW_MS; // remaining 20s is the play window
const UPDATE_INTERVAL_MS = 100;
const MAX_CRASH         = 120;
const GROWTH_FACTOR     = (MAX_CRASH - 1) / (PLAY_WINDOW_MS / 1000);

let io;
let currentRound = null;
let updateTimer, crashTimer;

// Mocks the transaction hash
function makeTxHash() {
  return crypto.randomBytes(16).toString('hex');
}

/*
  Kicks off a new round in 'pending' state and Emits it for BET_WINDOW_MS
  After which it flips to 'in_progress'state and starts multiplier updates & crash timer.
*/
async function startRound() {
  // Clear any leftover timers
  if (updateTimer)  clearInterval(updateTimer);
  if (crashTimer)   clearTimeout(crashTimer);

  // Determine next round number
  const count = await Round.countDocuments();
  const roundNumber = count + 1;

  // Initalizing provably fair seed & hash
  const { seed, seedHash } = initRoundSeed(roundNumber, MAX_CRASH);

  // Initial 'pending' state
  currentRound = await Round.create({
    roundNumber,
    seed,
    hash: seedHash,
    status: 'pending',
    startTime: new Date()
  });

  // Notify clients that betting window has opened
  io.emit('round:pending', {
    roundNumber,
    seedHash,
    betWindow: BET_WINDOW_MS / 1000
  });

  // After betting window ends, start play
  setTimeout(async () => {
    currentRound.status = 'in_progress';
    // Reset again startTime to now for play time.
    currentRound.startTime = new Date();
    await currentRound.save();

    io.emit('round:start', {
      roundNumber: currentRound.roundNumber,
      startTime: currentRound.startTime
    });

    // Starts multiplier updates
    const playStartMs = currentRound.startTime.getTime();
    updateTimer = setInterval(() => {
      const elapsed = (Date.now() - playStartMs) / 1000;
      const raw = 1 + elapsed * GROWTH_FACTOR;
      const multiplier = Math.floor(raw * 10) / 10;
      io.emit('multiplier:update', { multiplier });
    }, UPDATE_INTERVAL_MS);

    // Scheduling the crash
    const crashPoint = getCrashPoint(seed, roundNumber, MAX_CRASH);
    const crashDelay = ((crashPoint - 1) / GROWTH_FACTOR) * 1000;
    crashTimer = setTimeout(async () => {
      clearInterval(updateTimer);

      currentRound.crashPoint = crashPoint;
      currentRound.status     = 'crashed';
      currentRound.endTime    = new Date();
      await currentRound.save();

      io.emit('round:crash', { crashPoint });
    }, crashDelay);

  }, BET_WINDOW_MS);
}

// Set up per‑socket handlers for cashouts.

function setupWebSocketHandlers(_io) {
  io = _io;

  io.on('connection', socket => {
    console.log(`Client connected at: ${socket.id}`);

    socket.on('cashout', async ({ userId, currency }) => {
      try {
        if (!currentRound || currentRound.status !== 'in_progress') {
          return socket.emit('error', { message: 'No active play phase.' });
        }

        // Compute current multiplier and verify not crashed
        const elapsed = (Date.now() - currentRound.startTime.getTime()) / 1000;
        const currentMult = Math.floor((1 + elapsed * GROWTH_FACTOR) * 10) / 10;
        const trueCrash = getCrashPoint(
          currentRound.seed,
          currentRound.roundNumber,
          MAX_CRASH
        );
        if (currentMult >= trueCrash) {
          return socket.emit('error', { message: `Game crashed at ${trueCrash}×.` });
        }

        // Find user bet & ensure that they have not already cashed out
        const betTx = await Transaction.findOne({
          player: userId,
          round: currentRound._id,
          type: 'bet'
        });
        if (!betTx) {
          return socket.emit('error', { message: 'No bet found.' });
        }
        const dup = await Transaction.findOne({
          player: userId,
          round: currentRound._id,
          type: 'cashout'
        });
        if (dup) {
          return socket.emit('error', { message: 'Already cashed out.' });
        }

        // Calculate payout
        const payoutCrypto = Math.floor(betTx.cryptoAmount * currentMult * 1e8) / 1e8;

        // Update wallet
        const user = await User.findById(userId);
        const prevBal = user.wallet.get(currency) || 0;
        user.wallet.set(currency, prevBal + payoutCrypto);
        await user.save();

        // Log cashout transaction
        const usdAmount = await convertCryptoToUsd(payoutCrypto, currency);
        const tx = await Transaction.create({
          player: userId,
          round: currentRound._id,
          cryptoAmount: payoutCrypto,
          usdAmount,
          currency,
          type: 'cashout',
          transactionHash: makeTxHash(),
          priceAtTime: usdAmount / payoutCrypto
        });

        // Ackowledgment to the client
        socket.emit('cashout:success', { transaction: tx });
        // After that broadcast it to all
        io.emit('player:cashout', {
          userId, currency, payoutCrypto, usdAmount
        });
      } catch (err) {
        console.error('WS cashout error:', err);
        socket.emit('error', { message: 'Cashout failed.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected at: ${socket.id}`);
    });
  });
}

// Initiates the loops and handlers
function initWebSockets(_io) {
  setupWebSocketHandlers(_io);
  startRound();
  setInterval(startRound, TOTAL_ROUND_MS);
}

module.exports = { initWebSockets };