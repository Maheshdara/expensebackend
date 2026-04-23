const mongoose = require("mongoose");

// Counter Schema
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 999 // first generated id = 1000
  }
});

const Counter = mongoose.model("Counter", counterSchema);

// Auto Increment Function
const getNextSequence = async (sequenceName) => {
    console.log(sequenceName,"koolok");
    
    
  try {
    const counter = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true
      }
    );

    return counter.seq;
  } catch (error) {
    console.log("Counter Error:", error);
    throw error;
  }
};

module.exports = getNextSequence;