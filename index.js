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

const deleteRoom = (socket, room) => {
  socket.leave(room);
  roomOccupancy[room] = roomOccupancy[room] - 1;

  // Update room occupancy for all remaining clients in the room
  io.to(room).emit("room_occupancy", {
    room,
    occupancy: roomOccupancy[room],
  });
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    const rooms = Array.from(socket.rooms.values());
    const previousRoom = rooms.length > 1 ? rooms[1] : null;

    console.log(previousRoom);

    if (previousRoom) {
      if (data === previousRoom) {
        console.log("User already in the room");
        return;
      }

      deleteRoom(socket, previousRoom);
    }

    const room = data;
    const numSocketsInRoom = roomOccupancy[room] ? roomOccupancy[room] : 0;
    if (numSocketsInRoom < 2 && !socket.rooms.has(room)) {
      socket.join(room);
      roomOccupancy[room] = numSocketsInRoom + 1;

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
    const rooms = Array.from(socket.rooms.values());
    const previousRoom = rooms.length > 1 ? rooms[1] : null;
    console.log(previousRoom);
    if (previousRoom) {
      deleteRoom(socket, previousRoom);
    }

    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3001, "10.10.241.217", () => {
  console.log("SERVER IS RUNNING");
});
