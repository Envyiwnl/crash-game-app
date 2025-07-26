// Load Environment variables
const cors = require("cors");
require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Connect to mongoDB
const connectDB = require("./config/db");

async function start() {
  try {
    // Connect to mongoDB
    await connectDB();
    console.log("MongoDB connected");

    // Set up Express
    const app = express();

    // middleware to parse JSON bodies
    app.use(express.json());
    app.use(cors());

    // Serving requests at client
    app.use(express.static(path.join(__dirname, "../client")));

    // placeholder rest route
    const betRoute = require("./routes/bet");
    const cashoutRoute = require("./routes/cashout");
    const walletRoute = require("./routes/wallet");
    app.use("/bet", betRoute);
    app.use("/cashout", cashoutRoute);
    app.use("/wallet", walletRoute);

    app.get("/", (req, res) => {
      res.send("Cryptocrash backend is running");
    });

    // http server & socket.io
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Initialising the gameloop and ws handler once
    const { initWebSockets } = require("./ws/wsServer");
    initWebSockets(io);

    // Socket.io connection handler
    io.on("connection", (socket) => {
      console.log(`Client is connected at: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`Client has disconnected at: ${socket.id}`);
      });
    });

    // Starts Listening at PORT
    const PORT = process.env.PORT;
    server.listen(PORT, () => {
      console.log(`Server Listening at: ${PORT}`);
    });
  } catch (err) {
    console.error("Server Startup Error:", err);
    process.exit(1);
  }
}

start();
