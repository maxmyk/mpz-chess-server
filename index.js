const express = require('express')
const app = express()
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

app.use(cors)

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})

io.on('connection', (socket) => {
    console.log('a user connected ' + socket.id)
    socket.on('disconnect', () => {
        console.log('user disconnected')
    })
    socket.on('moves', (msg) => {
        console.log('message: ' + msg)
        socket.broadcast.emit('receive_move', msg)
    })
})

server.listen(3001, () => { 
    console.log('listening...')
})