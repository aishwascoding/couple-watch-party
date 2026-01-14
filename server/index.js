const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// 1. Allow Express to handle CORS
app.use(cors());

const server = http.createServer(app);

// 2. Allow Socket.io to handle CORS (The Critical Fix)
const io = new Server(server, {
  cors: {
    origin: "*", // <--- THIS IS THE KEY. It allows your Vercel app to connect.
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

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

  socket.on("call_user", (data) => {
    socket.to(data.roomId).emit("incoming_call", { 
        signal: data.signalData, 
        from: data.from 
    });
  });

  socket.on("answer_call", (data) => {
    socket.to(data.roomId).emit("call_accepted", data.signal);
  });

  socket.on("send_reaction", (data) => {
    socket.to(data.roomId).emit("receive_reaction", data.emoji);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});