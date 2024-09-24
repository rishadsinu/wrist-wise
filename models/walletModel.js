const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  balance: {
    type: Number,
    default: 0,
  },
  transactions: [
    {
      transactionId: { type: String },
      date: { type: Date, default: Date.now },
      description: String,
      amount: Number,
      type: {
        type: String,
        enum: ["credit", "debit"],
      },
    },
  ],
});

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;