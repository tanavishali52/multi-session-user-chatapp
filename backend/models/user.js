const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  devices: [
    {
      deviceId: String,
      socketId: String,
      lastActive: Date,
    },
  ],
});

module.exports = mongoose.model("User", userSchema);