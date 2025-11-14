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

    // Emit newUser event via Socket.IO
    const io = req.app.get("io");
    io.emit("newUser", { username });

    res.json({ message: "User created successfully", user: { username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const deviceId = `device-${Math.random().toString(36).substring(2, 9)}`;
  user.devices.push({ deviceId, lastActive: new Date() });
  await user.save();

  res.json({ message: "Login success", username, deviceId });
});

// Get all users
router.get("/users", async (req, res) => {
  const users = await User.find({}, "username");
  res.json(users);
});

// Delete user route
router.delete("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const deletedUser = await User.findOneAndDelete({ username });

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Emit deleteUser event
    const io = req.app.get("io");
    io.emit("deleteUser", username);

    res.json({ message: "User deleted successfully", username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Edit user route
router.put("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { newUsername, newPassword } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const oldUsername = user.username;
    if (newUsername) user.username = newUsername;
    if (newPassword) user.password = newPassword;

    await user.save();

    // Emit updateUser event
    const io = req.app.get("io");
    io.emit("updateUser", { oldUsername, username: user.username });

    res.json({
      message: "User updated successfully",
      user: { username: user.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
