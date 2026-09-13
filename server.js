import express from 'express'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })
const rooms = new Map()
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

app.get('/api/health', (_request, response) => response.json({ ok: true, rooms: rooms.size }))
app.use(express.static(path.join(currentDirectory, 'dist')))
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api')) return next()
  response.sendFile(path.join(currentDirectory, 'dist', 'index.html'))
})

function makeCode() {
  let code
  do code = `QZ-${Math.floor(100 + Math.random() * 900)}`
  while (rooms.has(code))
  return code
}

function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function stateFor(room) {
  return {
    code: room.code,
    round: room.round,
    winner: room.winner,
    players: [...room.players.values()],
  }
}

function broadcast(room) {
  io.to(room.code).emit('room-state', stateFor(room))
}

function getRoom(socket) {
  return rooms.get(socket.data.roomCode)
}

io.on('connection', (socket) => {
  socket.on('create-room', (callback) => {
    const room = { code: makeCode(), adminId: socket.id, round: 4, winner: null, players: new Map() }
    rooms.set(room.code, room)
    socket.data.roomCode = room.code
    socket.data.role = 'admin'
    socket.join(room.code)
    callback({ ok: true, code: room.code, role: 'admin' })
    broadcast(room)
  })

  socket.on('join-room', ({ code, name }, callback) => {
    const room = rooms.get(code?.trim().toUpperCase())
    if (!room) return callback({ ok: false, error: 'Room introuvable.' })
    if (!name?.trim()) return callback({ ok: false, error: 'Le pseudo est obligatoire.' })
    const player = { id: socket.id, name: name.trim().slice(0, 24), initials: initials(name.trim()), color: ['blue', 'green', 'purple', 'coral'][room.players.size % 4], score: 0, streak: 0, status: 'online' }
    room.players.set(socket.id, player)
    socket.data.roomCode = room.code
    socket.data.role = 'player'
    socket.join(room.code)
    callback({ ok: true, code: room.code, role: 'player' })
    broadcast(room)
  })

  socket.on('buzz', () => {
    const room = getRoom(socket)
    if (!room || socket.data.role !== 'player' || room.winner) return
    const player = room.players.get(socket.id)
    if (!player) return
    room.winner = { id: player.id, name: player.name }
    broadcast(room)
  })

  socket.on('next-round', () => {
    const room = getRoom(socket)
    if (!room || room.adminId !== socket.id) return
    room.round = room.round >= 10 ? 1 : room.round + 1
    room.winner = null
    broadcast(room)
  })

  socket.on('score-player', ({ playerId, points }, callback = () => {}) => {
    const room = getRoom(socket)
    const amount = Number(points)
    const player = room?.players.get(playerId)
    if (!room || room.adminId !== socket.id || !player || !Number.isInteger(amount) || amount < -1000 || amount > 1000) {
      return callback({ ok: false, error: 'Score invalide.' })
    }
    player.score += amount
    player.streak = amount > 0 ? player.streak + 1 : 0
    broadcast(room)
    callback({ ok: true })
  })

  socket.on('disconnect', () => {
    const room = getRoom(socket)
    if (!room) return
    if (room.adminId === socket.id) {
      io.to(room.code).emit('room-closed')
      rooms.delete(room.code)
      return
    }
    room.players.delete(socket.id)
    broadcast(room)
  })
})

const port = process.env.PORT || 3001
httpServer.listen(port, () => console.log(`QuizMaster backend running on http://localhost:${port}`))