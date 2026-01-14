const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Make sure this matches your React URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. JOIN ROOM
  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  // 2. VIDEO SYNC EVENTS
  socket.on("play_video", (data) => {
    socket.to(data.room).emit("receive_play");
  });

  socket.on("pause_video", (data) => {
    socket.to(data.room).emit("receive_pause");
  });

  socket.on("seek_video", (data) => {
    socket.to(data.room).emit("receive_seek", data.timestamp);
  });
  
  socket.on("file_change", (data) => {
    socket.to(data.room).emit("receive_file_change", data.fileData);
  });

  // 3. VIDEO CALL SIGNALS (WebRTC)
  socket.on("call_user", (data) => {
    socket.to(data.roomId).emit("incoming_call", { 
        signal: data.signalData, 
        from: data.from 
    });
  });

  socket.on("answer_call", (data) => {
    socket.to(data.roomId).emit("call_accepted", data.signal);
  });

  // 4. REACTION EVENT (The Missing Piece!) 💖
  socket.on("send_reaction", (data) => {
    // console.log("Reaction received:", data.emoji); // Uncomment to debug
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(data.roomId).emit("receive_reaction", data.emoji);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});