const mongoose = require("mongoose");

const roundSchema = new mongoose.Schema(
  {
    roundNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    seed: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
    crashPoint: {
      type: Number,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "crashed"],
      default: "pending",
    },
  },
  {
    timeStamps: true,
  }
);

module.exports = mongoose.model("Round", roundSchema);
