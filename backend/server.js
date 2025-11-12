
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { createServer } = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/authRoutes");
const User = require("./models/User");

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error(" MONGO_URI is not defined in .env");
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.get("/", (req, res) => res.send("Chat App Backend Running..."));


io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  socket.on("joinUser", async ({ username, deviceId }) => {
    if (!username || !deviceId) return;
    console.log(`${username} joined from device ${deviceId}`);

    const user = await User.findOne({ username });
    if (user) {
      const device = user.devices.find((d) => d.deviceId === deviceId);
      if (device) {
        device.socketId = socket.id;
        device.lastActive = new Date();
      } else {
        user.devices.push({ deviceId, socketId: socket.id, lastActive: new Date() });
      }
      await user.save();
    }
  });

  // Send a message
  socket.on("sendMessage", async (data) => {
    if (!data || !data.from || !data.to || !data.text) return;
    console.log("Message:", data);

    const receiver = await User.findOne({ username: data.to });
    if (receiver) {
      receiver.devices.forEach((d) => {
        if (d.socketId) io.to(d.socketId).emit("receiveMessage", data);
      });
    }

    const sender = await User.findOne({ username: data.from });
    if (sender) {
      sender.devices.forEach((d) => {
        if (d.socketId && d.socketId !== socket.id) {
          io.to(d.socketId).emit("receiveMessage", data);
        }
      });
    }
  });

  socket.on("disconnect", async () => {
    console.log(" Socket disconnected:", socket.id);
    await User.updateOne(
      { "devices.socketId": socket.id },
      { $set: { "devices.$.socketId": null } }
    );
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(` Server running on port ${PORT}`));
