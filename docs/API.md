# GDevelop Assistant API Documentation

## Base URLs

- **AI Agents Service**: `http://localhost:3001`
- **Game Server**: `http://localhost:3002`
- **Cloud Storage Service**: `http://localhost:3003`

## AI Agents Service API

### Health Check

**GET** `/health`

Returns the health status of the AI Agents service.

**Response:**
```json
{
  "status": "healthy",
  "service": "ai-agents"
}
```

### List All Agents

**GET** `/agents`

Returns a list of all active AI agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-1234567890",
      "type": "general",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Create AI Agent

**POST** `/agent/create`

Creates a new AI agent.

**Request Body:**
```json
{
  "agentId": "custom-agent-id",
  "type": "combat",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "custom-agent-id",
    "type": "combat",
    "config": {...},
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Delete AI Agent

**DELETE** `/agent/:agentId`

Deletes an AI agent by ID.

**Response:**
```json
{
  "success": true,
  "message": "Agent deleted"
}
```

### Query AI Agent

**POST** `/agent/:agentId/query`

Sends a query to an AI agent and receives a response.

**Request Body:**
```json
{
  "query": "What is the best strategy for this situation?"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "agentId": "agent-123",
    "query": "What is the best strategy for this situation?",
    "answer": "AI Agent processed: What is the best strategy...",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "model": "gpt-4"
  }
}
```

### WebSocket Events

Connect to the AI Agents service via Socket.IO:

```javascript
const socket = io('http://localhost:3001');

// Register agent
socket.emit('agent:register', {
  agentId: 'my-agent',
  type: 'assistant'
});

// Listen for registration confirmation
socket.on('agent:registered', (agent) => {
  console.log('Agent registered:', agent);
});

// Send query
socket.emit('agent:query', {
  agentId: 'my-agent',
  query: 'Help me with game logic'
});

// Listen for response
socket.on('agent:response', (data) => {
  console.log('Response:', data);
});

// Listen for errors
socket.on('agent:error', (error) => {
  console.error('Error:', error);
});
```

## Game Server API

### Health Check

**GET** `/health`

Returns the health status of the game server.

**Response:**
```json
{
  "status": "healthy",
  "service": "game-server"
}
```

### Server Status

**GET** `/status`

Returns detailed server status information.

**Response:**
```json
{
  "players": 42,
  "maxPlayers": 100,
  "rooms": 5,
  "tickRate": 60,
  "uptime": 3600.5
}
```

### List Game Rooms

**GET** `/rooms`

Returns a list of all game rooms.

**Response:**
```json
{
  "rooms": [
    {
      "id": "room-1234567890",
      "name": "Room 1",
      "players": 5,
      "maxPlayers": 10,
      "status": "active"
    }
  ],
  "count": 1
}
```

### Create Game Room

**POST** `/room/create`

Creates a new game room.

**Request Body:**
```json
{
  "roomName": "My Awesome Room",
  "maxPlayers": 10
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room-1234567890",
    "name": "My Awesome Room",
    "maxPlayers": 10,
    "players": [],
    "status": "waiting",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### WebSocket Events

Connect to the Game Server via Socket.IO:

```javascript
const socket = io('http://localhost:3002');

// Join as player
socket.emit('player:join', {
  username: 'Player1',
  characterId: 'char-123'
});

// Listen for join confirmation
socket.on('player:joined', (player) => {
  console.log('Joined as:', player);
});

// Listen for new players
socket.on('player:new', (data) => {
  console.log('New player joined:', data);
});

// Send movement
socket.emit('player:move', {
  position: { x: 100, y: 50, z: 0 }
});

// Listen for other players' movement
socket.on('player:moved', (data) => {
  console.log('Player moved:', data);
});

// Send action
socket.emit('player:action', {
  action: 'attack',
  target: 'enemy-123'
});

// Listen for actions
socket.on('player:action', (data) => {
  console.log('Player action:', data);
});

// Join a room
socket.emit('room:join', {
  roomId: 'room-123'
});

// Listen for room events
socket.on('room:joined', (data) => {
  console.log('Joined room:', data);
});

socket.on('room:player-joined', (data) => {
  console.log('Player joined room:', data);
});

// Listen for game ticks
socket.on('game:tick', (gameState) => {
  // Update game state
});
```

## Cloud Storage Service API

### Health Check

**GET** `/health`

Returns the health status of the cloud storage service.

**Response:**
```json
{
  "status": "healthy",
  "service": "cloud-storage"
}
```

### Upload Character Asset

**POST** `/characters/:characterId/upload`

Uploads an asset for a specific character.

**Request Body:**
```json
{
  "fileName": "character-skin.png",
  "fileData": "base64-encoded-file-data",
  "fileType": "image/png"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/bucket/path/to/file",
  "key": "game-assets/characters/char-123/character-skin.png"
}
```

### List Character Assets

**GET** `/characters/:characterId/assets`

Lists all assets for a specific character.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "key": "game-assets/characters/char-123/skin.png",
      "size": 102400,
      "lastModified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Upload Account Asset

**POST** `/accounts/:userId/upload`

Uploads an asset for a specific account.

**Request Body:**
```json
{
  "fileName": "profile-picture.jpg",
  "fileData": "base64-encoded-file-data",
  "fileType": "image/jpeg"
}
```

### Upload Hero Asset

**POST** `/heroes/:heroId/upload`

Uploads an asset for a specific hero.

**Request Body:**
```json
{
  "fileName": "hero-model.glb",
  "fileData": "base64-encoded-file-data",
  "fileType": "model/gltf-binary"
}
```

### List Hero Assets

**GET** `/heroes/:heroId/assets`

Lists all assets for a specific hero.

### Upload Game Asset

**POST** `/assets/upload`

Uploads a general game asset.

**Request Body:**
```json
{
  "category": "textures",
  "fileName": "ground-texture.png",
  "fileData": "base64-encoded-file-data",
  "fileType": "image/png"
}
```

### List Assets by Category

**GET** `/assets/:category`

Lists all assets in a specific category.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "key": "game-assets/game/textures/ground.png",
      "size": 204800,
      "lastModified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Download File

**GET** `/download?key=<file-key>`

Generates a signed URL to download a file.

**Response:**
```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/bucket/file?AWSAccessKeyId=..."
}
```

### Delete File

**DELETE** `/delete?key=<file-key>`

Deletes a file from cloud storage.

**Response:**
```json
{
  "success": true,
  "message": "File deleted"
}
```

## Data Models

### Character
```json
{
  "characterId": "char-123",
  "userId": "user-456",
  "name": "Warrior",
  "class": "fighter",
  "level": 10,
  "experience": 5000,
  "stats": {
    "health": 100,
    "mana": 50,
    "strength": 20,
    "agility": 15,
    "intelligence": 10
  },
  "position": {
    "x": 100,
    "y": 200,
    "z": 0,
    "map": "world-1"
  },
  "inventory": [
    {
      "itemId": "sword-1",
      "quantity": 1,
      "slot": 0
    }
  ],
  "equipment": {
    "weapon": "sword-1",
    "armor": "plate-armor",
    "helmet": "iron-helmet",
    "boots": "leather-boots",
    "accessories": ["ring-1", "amulet-1"]
  }
}
```

### Account
```json
{
  "userId": "user-123",
  "username": "player1",
  "email": "player1@example.com",
  "characters": ["char-1", "char-2"],
  "premium": true,
  "premiumExpiry": "2024-12-31T23:59:59.000Z",
  "currency": {
    "gold": 10000,
    "gems": 500
  },
  "settings": {
    "graphics": "high",
    "sound": true,
    "music": true
  }
}
```

### Hero
```json
{
  "heroId": "hero-123",
  "name": "Dragon Slayer",
  "title": "The Legendary",
  "rarity": "legendary",
  "baseStats": {
    "health": 200,
    "attack": 50,
    "defense": 30,
    "speed": 40
  },
  "abilities": [
    {
      "abilityId": "fireball",
      "name": "Fireball",
      "description": "Launches a ball of fire",
      "cooldown": 5,
      "manaCost": 20
    }
  ],
  "unlockRequirements": {
    "level": 20,
    "currency": 1000,
    "questId": "quest-dragon"
  }
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to 100 requests per 15 minutes per IP address. Exceeding this limit will result in a 429 (Too Many Requests) response.

## Authentication

Currently, the API does not require authentication for development purposes. In production, implement proper authentication using JWT tokens or API keys.

Example with JWT:
```javascript
fetch('http://localhost:3001/agents', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})
```

## CORS

All services are configured to accept requests from any origin during development. In production, configure CORS to only allow requests from trusted domains.
