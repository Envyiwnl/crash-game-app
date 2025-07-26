const cors = require('cors');
// Load Environment variables
require('dotenv').config();

// Connect to mongoDB
const connectDB = require('./config/db');
connectDB();

// Set up Express
const express = require('express');
const app = express();
const path = require('path');

// middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

// Serving requests at client
app.use(express.static(path.join(__dirname, '../client')));

// placeholder rest route
const betRoute = require('./routes/bet');
const cashoutRoute = require('./routes/cashout');
const walletRoute = require('./routes/wallet');

app.use('/bet', betRoute);
app.use('/cashout', cashoutRoute);
app.use('/wallet', walletRoute);

app.get('/',(req,res) => {
    res.send('Cryptocrash backend is running');
});

// http server & socket.io
const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin:'*',
        methods:['GET','POST']
    }
});

// Initialising the gameloop and ws handler once
const { initWebSockets } = require('./ws/wsServer');
initWebSockets(io);

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`Client is connected at: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`Client has disconnected at: ${socket.id}`);
    });
});

// Starts Listening at PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server Listening at: ${PORT}`);
});