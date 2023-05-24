const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const e = require("express");

app.use(cors());

const server = http.createServer(app);

const address = "10.10.241.46"
const port = 3001;

const io = new Server(server, {
  cors: {
    origin: "http://"+address+":3000",
    methods: ["GET", "POST"],
  },
});

const roomOccupancy = {};
const prevRooms = {};
const savedMoves = {};

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
  prevRooms[socket.id] = null;

  socket.on("join_room", (room) => {
    if (prevRooms[socket.id]) {
      if (room === prevRooms[socket.id]) {
        console.log("User already in the room");
        socket.emit("user_exists");
        return;
      }

      deleteRoom(prevRooms[socket.id]);
    }

    const numSocketsInRoom = roomOccupancy[room] || 0;
    if (numSocketsInRoom < 2 && prevRooms[socket.id] !== room) {
      socket.join(room);
      prevRooms[socket.id] = room;
      roomOccupancy[room] = numSocketsInRoom + 1;
      console.log(`User ${socket.id} joined room ${room}`);

      // Notify the client about joining the room
      socket.emit("room_joined", { room });

      // Update room occupancy for all clients in the room
      io.to(room).emit("room_occupancy", {
        room,
        occupancy: roomOccupancy[room],
      });

      if (roomOccupancy[room] === 2) {
        const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room));
        const firstUser = usersInRoom[0];
        const secondUser = usersInRoom[1];
        io.to(firstUser).emit("receive_side", { room, message: "black" });
        io.to(secondUser).emit("receive_side", { room, message: "white" });
        console.log(`Users in room ${room}:`, usersInRoom);
      }
    } else {
      // Room already full or socket already in the room, notify the client
      console.log("Room full or socket already in the room");
      socket.emit("room_full");
    }
  });

  socket.on("disconnect", () => {
    if (prevRooms[socket.id]) {
      deleteRoom(prevRooms[socket.id]);
      delete prevRooms[socket.id];
    }
    console.log(`User Disconnected: ${socket.id}`);
  });

  // Multiplayer
  socket.on("send_move", (data) => {
    console.log(data);
    console.log("emitting");
    console.log(data.room);
    savedMoves[data.room] = data;
    socket.to(data.room).emit("receive_move", data);
    console.log("done something");
  });

  socket.on("send_message", (data) => {
    console.log(data);
    console.log("emitting");
    console.log(data.room);
    socket.to(data.room).emit("receive_message", data.message);
    console.log("done something");
  });

  socket.on("get_move", (data) => {
    console.log(data);
    console.log("emitting");
    console.log(data.room);
    // Check if there is a saved move
    if (savedMoves[data.room]) {
      socket.to(data.room).emit("receive_move", savedMoves[data.room]);
    }
    else {
      socket.to(data.room).emit("receive_move", "start");
    }
    console.log("done something");
  });
});

server.listen(port, () => {
  console.log("Server is running on port", port);
});
