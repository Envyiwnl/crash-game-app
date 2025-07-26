Crypto Crash

An online “Crash” game backend (and accompanying React/Tailwind frontend) where players bet in USD (converted to BTC/ETH), watch an exponential multiplier, and cash out before the game crashes. Built with Node.js, Express, MongoDB, Socket.IO, and Vite/React.

**Tech Stack**

Backend: Node.js, Express.js

Database: MongoDB (via Mongoose)

WebSockets: Socket.IO

Crypto Prices: CoinGecko public API (10 s cache)

Frontend: Vite + React + Tailwind CSS + Chart.js

Utilities: Axios for HTTP, date-fns adapter for Chart.js

**Prerequisites & Setup**

Clone the repo

git clone https://github.com/Envyiwnl/crash-game-app.git

Environment variables

MONGODB_URI=mongodb://localhost:27017/crypto-crash
CRYPTO_API_BASE_URL=https://api.coingecko.com/api/v3
PRICE_CACHE_TTL_SECONDS=10

**Install dependencies**

# Backend
npm install

# Frontend
cd ../crypto-crash-client
npm install

**Seed sample data**

**IMPORTANT: RUN THIS BEFORE YOU START BETTING TO GET THE USER IDS**
npm run seed (This creates 5 users with ETH and BTC balances and logs there user ID's)

**Running the App**

# Frontend
cd crypto-crash-client
npm run dev

# backend
cd crypto-crash-backend
npm run dev

**API ENDPOINTS**

Wallet Balance

URL: GET /wallet?userId=<userId>

Params: userId (string, required): MongoDB user ObjectId

# Response Format

{
  "wallet": { "BTC": 1.0, "ETH": 5.0 },
  "usdBalance": { "BTC": 60000, "ETH": 2000 }
}

Place Bet

URL: POST /bet

Body (JSON): {
  "userId": "<userId>",
  "roundNumber": 12,
  "usdAmount": 10,
  "currency": "BTC"
}

# Response Format

{
  "round": {
    "roundNumber": 3,
    "status": "pending",
    "seedHash": "6cf996edf6dbff3189099438e1c8a3c349a195bd47d6322d4f17adfd9dd4492f",
    "betWindow": 10
  },
  "transaction": {
    "player": "64ef1c2a3b4d5e6f7a8b9c0d",
    "usdAmount": 10,
    "cryptoAmount": 0.005,          
    "currency": "ETH",
    "transactionType": "bet",
    "transactionHash": "ae34f1bc9d8e2fa3b7c6d5e4f2a1b0c9",
    "priceAtTime": 2000,           
    "timestamp": "2025-07-26T22:15:03.123Z"
  }
}

Cash out

URL: POST /cashout

Body (JSON): {
  "userId": "<userId>",
  "roundNumber": 12,
  "currency": "BTC",
  "multiplier": 2.5
}

# Response Format

{
  "round": {
    "roundNumber": 3,
    "status": "in_progress"
  },
  "transaction": {
    "player": "64ef1c2a3b4d5e6f7a8b9c0d",
    "usdAmount": 26,
    "cryptoAmount": 0.0125,
    "currency": "ETH",
    "transactionType": "cashout",
    "transactionHash": "d4c3b2a1908f7e6d5c4b3a2f1e0d9c8b",
    "priceAtTime": 2000,
    "timestamp": "2025-07-26T22:15:13.456Z"
  },
  "payout": {
    "usdPayout": 26,
    "cryptoPayout": 0.0125
  },
  "newWalletBalance": {
    "ETH": 5.0125
  }
}

**WebSocket Events**

Connect to ws://localhost:3000 via Socket.IO and listen for:
Event	Direction	Payload
round:pending	server -> ws	{ roundNumber, seedHash, betWindow }
round:start	server -> ws	{ roundNumber }
multiplier:update	server -> ws	{ multiplier }
round:crash	server -> ws	{ crashPoint }
player:cashout	server -> ws	{ userId, payoutCrypto, usdAmount, currency }

 **round:pending**
   Payload: `{ roundNumber: number, seedHash: string, betWindow: number }`
 **round:start**
   Payload: `{ roundNumber: number }`
 **multiplier:update**
   Payload: `{ multiplier: number }`
 **player:cashout**
   Payload: `{ userId: string, payoutCrypto: number, usdAmount: number, currency: string }`
 **round:crash**
   Payload: `{ crashPoint: number }`

# emit from client:

cashout with { userId, currency }

**Provably Fair Algorithm**

Server seed: cryptographically secure 64‑char hex.

Seed hash: SHA256(server seed) sent to clients in round:pending.

Crash point:

H = HMAC_SHA256(serverSeed, roundNumber)
crash = (extractIntFromHash(H) % maxCrash) / 100

Verification: after crash, server reveals seed, clients hash it + roundNumber to confirm crash value.

**USD ↔ Crypto Conversion**

Fetch price via CoinGecko /simple/price?ids=<id>&vs_currencies=usd.

Cache TTL: 10 s to respect rate limits.

Convert USD → crypto: cryptoAmount = usdAmount / price.

Convert crypto → USD: usdValue = cryptoAmount * price.

Transactions store priceAtTime for auditability.

**Testing**

# Postman Collection

Import test/postman_collection.json, then set:
Variable: Value
userId: your seeded user ObjectId
roundNumber: current pending round number
usdAmount: e.g. 10
currency: BTC or ETH
multiplier: last tick before cashout
Run Get Wallet, Place Bet, then Cash Out in the correct windows.

**cURL Examples**

# Wallet
curl "http://localhost:3000/wallet?userId=64ef1c2a3b4d5e6f7a8b9c0d" (Note: The user id is a dummy please use actual user id's from your MongoDB)

# Bet
curl -XPOST http://localhost:3000/bet \
  -H "Content-Type: application/json" \
  -d '{"userId":"<id>","roundNumber":1,"usdAmount":10,"currency":"BTC"}'

# Cashout
curl -XPOST http://localhost:3000/cashout \
  -H "Content-Type: application/json" \
  -d '{"userId":"<id>","roundNumber":1,"currency":"BTC","multiplier":2.5}'


# Test Users:

 • alice: 6884dfc1de0e6c0eb9da2a0b
 • bob: 6884dfc1de0e6c0eb9da2a0c
 • carol: 6884dfc1de0e6c0eb9da2a0d
 • jeffry: 6884dfc1de0e6c0eb9da2a0e
 • Vans: 6884dfc1de0e6c0eb9da2a0f

**Fairness Algorithims Evaluation**

There are two factors which ensures fairness:

# Unpredictibility: 

Until you reveal the seed after the crash, nobody (not even you) can know the exact multiplier.

# Verifiability:

Players can take your seed + round number, run the same code, and see that it produces the exact crash point you used.