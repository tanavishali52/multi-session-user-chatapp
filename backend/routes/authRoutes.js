const express = require("express");
const User = require("../models/User");

const router = express.Router();

// Signup route
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Username already exists" });

    const user = new User({ username, password });
    await user.save();
    res.json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // Generate random device ID
  const deviceId = `device-${Math.random().toString(36).substring(2, 9)}`;

  // Add device to user
  user.devices.push({ deviceId, lastActive: new Date() });
  await user.save();

  res.json({
    message: "Login success",
    username,
    deviceId,
  });
});
router.get("/users", async (req, res) => {
  const users = await User.find({}, "username"); // only send usernames
  res.json(users);
});

module.exports = router;
