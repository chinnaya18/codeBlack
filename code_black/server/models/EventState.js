const mongoose = require("mongoose");

const EventState = new mongoose.Schema({
  activeRound: { type: Number, default: 1 },
  submissionsLocked: { type: Boolean, default: false },
  roundEndsAt: Date,
});

module.exports = mongoose.model("EventState", EventState);
