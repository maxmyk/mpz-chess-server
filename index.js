const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://10.10.241.217:3000",
    methods: ["GET", "POST"],
  },
});

// Track room occupancy
const roomOccupancy = {};
const prevRooms = {};

const deleteRoom = (room) => {
  roomOccupancy[room] = roomOccupancy[room] - 1;

  // Update room occupancy for all remaining clients in the room
  io.to(room).emit("room_occupancy", {
    room,
    occupancy: roomOccupancy[room],
  });
  // Remove the room from roomOccupancy when no users left
  if (roomOccupancy[room] === 0) {
    delete roomOccupancy[room];
  }
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  prevRooms[socket] = null;

  socket.on("join_room", (data) => {
    if (prevRooms[socket]) {
      if (data === previousRoom) {
        console.log("User already in the room");
        return;
      }

      deleteRoom(previousRoom);
    }

    const room = data;
    const numSocketsInRoom = roomOccupancy[room] || 0;
    if (numSocketsInRoom < 2 && !socket.rooms.has(room)) {
      socket.join(room);
      prevRooms[socket] = room;
      roomOccupancy[room] = numSocketsInRoom + 1;
      previousRoom = room;

      console.log(`User ${socket.id} joined room ${room}`);

      // Notify the client about joining the room
      socket.emit("room_joined", { room });

      // Update room occupancy for all clients in the room
      io.to(room).emit("room_occupancy", {
        room,
        occupancy: roomOccupancy[room],
      });
    } else {
      // Room already full or socket already in the room, notify the client
      console.log("Room full or socket already in the room");
      socket.emit("room_full");
    }
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log(prevRooms[socket]);
    if (prevRooms[socket]) {
      deleteRoom(prevRooms[socket]);
    }
    delete prevRooms[socket];
    console.log(prevRooms);
    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3001, "10.10.241.217", () => {
  console.log("SERVER IS RUNNING");
});
