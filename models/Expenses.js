const mongoose = require("mongoose");

const Expenses = new mongoose.Schema({
  expenseId: { type: Number, required: true, unique: true },
  name: { type: String, required: true, },
  amount: { type: Number, required: true },
  createdby: { type: String, required: true },
  user: { type: String, required: true },
  createdDate: { type: Date, required: true },
  location: { type: String },
  expenseType: { type: Boolean },
  groupId: { type: String, default: null, },
  expenseDate:{ type: Date, required: true },
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Expenses", Expenses);