const crypto = require('crypto');

// Generates a random server seed for provable fairness returns a { string } of 64-character hex seed

function generateSeed () {
    return crypto.randomBytes(32).toString('hex');
}

// Computes the SHA-256 hash for the seed which the client can verify after the round, that the revealed matches the hash.

function getSeedHash(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex');
}

/*Crash Point Explanation
Step 1: Combine seed and round number for eg (efd234:45) so each round will use a distinct hash.
Step 2: Now we take SHA 256 of that string, from which we yield a 64-byte hex string.
Step 3: Now we take the first 13 hex characters for randomness which will be equivalent to 52 bits,after that we convert it into integer and store it in H.
Step 4: After normalizing it which gives us a [0,1] range we compute the crash multiplier crash = floor((1/r) * 100) / 100 this mapping gives us probalility distribution with two decimnal points.
Step 5: Now we apply bounds such as if r is zero we set crash=maxCrash, Otherwise we clamp any result below 1 up to 1.0, and anything above maxCrash down to maxCrash.
*/ 

function getCrashPoint (seed, roundNumber, maxCrash=100) {
    const data = `${seed}:${roundNumber}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');

    const H = parseInt(hash.slice(0,13), 16);
    const E = Math.pow(2,52);
    const r = H/E;

    let crash = r === 0 ? maxCrash : Math.floor((1 / r) * 100) / 100;

    if (crash < 1) crash = 1.0;
    if (crash > maxCrash) crash = maxCrash;

    return crash;
}

// At start of round calls both seed and seedHash

function initRoundSeed(roundNumber, maxCrash = 100) {
  const seed = generateSeed();
  const seedHash = getSeedHash(seed);
  return { seed, seedHash };
}

module.exports = {
    generateSeed,
    getSeedHash,
    getCrashPoint,
    initRoundSeed
};