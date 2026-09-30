import express from 'express'
import { createServer } from 'node:http'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })
const ROOM_CHANNEL = 'quiz-room'
let activeRoom = null
let roomCreationPending = false
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const quizContentUrl = new URL('./quiz-content.js', import.meta.url)

async function getQuizContent() {
  const { mtimeMs, ctimeMs } = await stat(quizContentUrl)
  const moduleUrl = new URL(quizContentUrl)
  moduleUrl.searchParams.set('updated', `${mtimeMs}-${ctimeMs}`)
  return import(moduleUrl.href)
}

app.get('/api/health', (_request, response) => response.json({ ok: true, rooms: activeRoom ? 1 : 0 }))
app.use(express.static(path.join(currentDirectory, 'dist')))
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api')) return next()
  response.sendFile(path.join(currentDirectory, 'dist', 'index.html'))
})

function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function stateFor(room) {
  return {
    round: room.round,
    phase: room.phase,
    category: room.category,
    slide: room.slide,
    winner: room.winner,
    players: [...room.players.values()],
  }
}

function broadcast(room) {
  io.to(ROOM_CHANNEL).emit('room-state', stateFor(room))
}

function getRoom(socket) {
  return socket.data.roomChannel === ROOM_CHANNEL ? activeRoom : null
}

io.on('connection', (socket) => {
  socket.on('create-room', async (callback = () => {}) => {
    if (activeRoom || roomCreationPending) return callback({ ok: false, error: 'La room existe déjà ou est en cours d’ouverture. Rejoignez-la comme joueur.' })
    roomCreationPending = true
    try {
      const { defaultCategory } = await getQuizContent()
      const room = { adminId: socket.id, round: 1, phase: 'question', category: defaultCategory, slide: 0, winner: null, players: new Map() }
      activeRoom = room
      socket.data.roomChannel = ROOM_CHANNEL
      socket.data.role = 'admin'
      socket.join(ROOM_CHANNEL)
      callback({ ok: true, role: 'admin' })
      broadcast(room)
    } catch {
      callback({ ok: false, error: 'Impossible d’ouvrir le quiz.' })
    } finally {
      roomCreationPending = false
    }
  })

  socket.on('join-room', ({ name }, callback) => {
    const room = activeRoom
    if (!room) return callback({ ok: false, error: 'Aucune room n’est ouverte pour le moment.' })
    if (!name?.trim()) return callback({ ok: false, error: 'Le pseudo est obligatoire.' })
    const player = { id: socket.id, name: name.trim().slice(0, 24), initials: initials(name.trim()), color: ['blue', 'green', 'purple', 'coral'][room.players.size % 4], score: 0, streak: 0, status: 'online' }
    room.players.set(socket.id, player)
    socket.data.roomChannel = ROOM_CHANNEL
    socket.data.role = 'player'
    socket.join(ROOM_CHANNEL)
    callback({ ok: true, role: 'player' })
    broadcast(room)
  })

  socket.on('buzz', () => {
    const room = getRoom(socket)
    if (!room || socket.data.role !== 'player' || room.phase !== 'buzz' || room.winner) return
    const player = room.players.get(socket.id)
    if (!player) return
    room.winner = { id: player.id, name: player.name }
    broadcast(room)
  })

  socket.on('unlock-buzzer', () => {
    const room = getRoom(socket)
    if (!room || room.adminId !== socket.id || room.phase !== 'buzz' || !room.winner) return
    room.winner = null
    broadcast(room)
  })

  socket.on('next-round', () => {
    const room = getRoom(socket)
    if (!room || room.adminId !== socket.id) return
    if (room.phase === 'question') {
      room.phase = 'buzz'
    } else {
      room.round = room.round >= 10 ? 1 : room.round + 1
      room.phase = 'question'
    }
    room.winner = null
    broadcast(room)
  })

  socket.on('presentation-category', async (category) => {
    const room = getRoom(socket)
    const { categories } = await getQuizContent()
    if (!room || room.adminId !== socket.id || !categories.includes(category)) return
    room.category = category
    room.slide = 0
    room.phase = 'question'
    room.winner = null
    broadcast(room)
  })

  socket.on('presentation-slide', async (direction) => {
    const room = getRoom(socket)
    const { slides } = await getQuizContent()
    if (!room || room.adminId !== socket.id || room.phase !== 'question') return
    const lastSlide = slides[room.category].length - 1
    room.slide = Math.max(0, Math.min(lastSlide, room.slide + (direction === 'next' ? 1 : -1)))
    broadcast(room)
  })

  socket.on('play-slide-media', async () => {
    const room = getRoom(socket)
    if (!room || room.adminId !== socket.id || room.phase !== 'question') return
    const { category, slide } = room
    const { slides } = await getQuizContent()
    if (room.category !== category || room.slide !== slide || room.phase !== 'question') return
    const media = slides[category]?.[slide]?.media
    if (!media || !['audio', 'video'].includes(media.type) || typeof media.src !== 'string') return
    socket.to(ROOM_CHANNEL).emit('slide-media-play', { category, slide })
  })

  socket.on('pause-slide-media', async () => {
    const room = getRoom(socket)
    if (!room || room.adminId !== socket.id || room.phase !== 'question') return
    const { category, slide } = room
    const { slides } = await getQuizContent()
    if (room.category !== category || room.slide !== slide || room.phase !== 'question') return
    const media = slides[category]?.[slide]?.media
    if (!media || !['audio', 'video'].includes(media.type) || typeof media.src !== 'string') return
    socket.to(ROOM_CHANNEL).emit('slide-media-pause', { category, slide })
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
      io.to(ROOM_CHANNEL).emit('room-closed')
      for (const clientSocketId of io.sockets.adapter.rooms.get(ROOM_CHANNEL) ?? []) {
        const clientSocket = io.sockets.sockets.get(clientSocketId)
        if (clientSocket) {
          clientSocket.data.roomChannel = null
          clientSocket.data.role = null
        }
      }
      io.in(ROOM_CHANNEL).socketsLeave(ROOM_CHANNEL)
      activeRoom = null
      return
    }
    room.players.delete(socket.id)
    broadcast(room)
  })
})

const port = process.env.PORT || 3001
httpServer.listen(port, () => console.log(`QuizMaster backend running on http://localhost:${port}`))