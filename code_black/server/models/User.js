const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
});

module.exports = mongoose.model("User", UserSchema);
