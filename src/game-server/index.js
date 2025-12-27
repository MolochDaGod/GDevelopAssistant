const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    this.port = process.env.GAME_SERVER_PORT || 3002;
    this.maxPlayers = parseInt(process.env.GAME_SERVER_MAX_PLAYERS) || 100;
    this.tickRate = parseInt(process.env.GAME_SERVER_TICK_RATE) || 60;
    this.players = new Map();
    this.gameRooms = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.startGameLoop();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'game-server' });
    });

    this.app.get('/status', (req, res) => {
      res.json({
        players: this.players.size,
        maxPlayers: this.maxPlayers,
        rooms: this.gameRooms.size,
        tickRate: this.tickRate,
        uptime: process.uptime()
      });
    });

    this.app.get('/rooms', (req, res) => {
      const rooms = Array.from(this.gameRooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        status: room.status
      }));
      res.json({ rooms, count: rooms.length });
    });

    this.app.post('/room/create', (req, res) => {
      try {
        const { roomName, maxPlayers } = req.body;
        const room = {
          id: `room-${Date.now()}`,
          name: roomName || `Room ${this.gameRooms.size + 1}`,
          maxPlayers: maxPlayers || 10,
          players: [],
          status: 'waiting',
          createdAt: new Date()
        };
        this.gameRooms.set(room.id, room);
        res.json({ success: true, room });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Player connected:', socket.id);

      socket.on('player:join', (data) => {
        if (this.players.size >= this.maxPlayers) {
          socket.emit('player:error', { error: 'Server is full' });
          return;
        }

        const player = {
          id: socket.id,
          username: data.username || `Player${this.players.size + 1}`,
          characterId: data.characterId,
          position: { x: 0, y: 0, z: 0 },
          health: 100,
          status: 'active',
          joinedAt: new Date()
        };

        this.players.set(socket.id, player);
        socket.emit('player:joined', player);
        this.io.emit('player:new', { playerId: socket.id, username: player.username });
      });

      socket.on('player:move', (data) => {
        const player = this.players.get(socket.id);
        if (player) {
          player.position = data.position;
          socket.broadcast.emit('player:moved', {
            playerId: socket.id,
            position: data.position
          });
        }
      });

      socket.on('player:action', (data) => {
        const player = this.players.get(socket.id);
        if (player) {
          this.io.emit('player:action', {
            playerId: socket.id,
            action: data.action,
            target: data.target
          });
        }
      });

      socket.on('room:join', (data) => {
        const room = this.gameRooms.get(data.roomId);
        if (!room) {
          socket.emit('room:error', { error: 'Room not found' });
          return;
        }

        if (room.players.length >= room.maxPlayers) {
          socket.emit('room:error', { error: 'Room is full' });
          return;
        }

        room.players.push(socket.id);
        socket.join(data.roomId);
        socket.emit('room:joined', { roomId: data.roomId });
        this.io.to(data.roomId).emit('room:player-joined', { playerId: socket.id });
      });

      socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        this.players.delete(socket.id);
        
        // Remove player from rooms
        for (const room of this.gameRooms.values()) {
          const index = room.players.indexOf(socket.id);
          if (index > -1) {
            room.players.splice(index, 1);
            this.io.to(room.id).emit('room:player-left', { playerId: socket.id });
          }
        }

        this.io.emit('player:left', { playerId: socket.id });
      });
    });
  }

  startGameLoop() {
    const tickInterval = 1000 / this.tickRate;
    setInterval(() => {
      this.gameTick();
    }, tickInterval);
  }

  gameTick() {
    // Game logic update - runs at the specified tick rate
    // This can include physics updates, AI updates, etc.
    const gameState = {
      players: Array.from(this.players.values()),
      timestamp: Date.now()
    };
    
    // Broadcast game state to all connected clients
    this.io.emit('game:tick', gameState);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Game Server running on port ${this.port}`);
      console.log(`Max players: ${this.maxPlayers}, Tick rate: ${this.tickRate}Hz`);
    });
  }
}

module.exports = GameServer;

if (require.main === module) {
  const server = new GameServer();
  server.start();
}
