# Quick Start Guide

Get GDevelop Assistant up and running in 5 minutes!

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Node.js 18+](https://nodejs.org/) installed (optional, for local development)

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/MolochDaGod/GDevelopAssistant.git
   cd GDevelopAssistant
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (optional for testing)
   ```

3. **Start all services**
   ```bash
   ./deploy/deploy.sh local
   ```
   
   Or using npm:
   ```bash
   npm run docker:up
   ```

4. **Verify services are running**
   ```bash
   curl http://localhost:3001/health  # AI Agents
   curl http://localhost:3002/health  # Game Server
   curl http://localhost:3003/health  # Cloud Storage
   ```

5. **Try the example client**
   ```bash
   npm install
   npm run example
   ```

### Option 2: Manual Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/MolochDaGod/GDevelopAssistant.git
   cd GDevelopAssistant
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB and Redis**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

4. **Start services**
   ```bash
   # Terminal 1 - AI Agents
   npm run start:ai-agents

   # Terminal 2 - Game Server
   npm run start:game-server

   # Terminal 3 - Cloud Storage
   npm run start:cloud-storage
   ```

## 📝 What's Running?

After starting the services, you'll have:

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| AI Agents | 3001 | http://localhost:3001 | AI agent management and queries |
| Game Server | 3002 | http://localhost:3002 | Multiplayer game server |
| Cloud Storage | 3003 | http://localhost:3003 | Asset storage and management |
| MongoDB | 27017 | localhost:27017 | Database for characters/accounts |
| Redis | 6379 | localhost:6379 | Cache and session storage |

## 🧪 Testing the Services

### Test AI Agents

```bash
# Create an AI agent
curl -X POST http://localhost:3001/agent/create \
  -H "Content-Type: application/json" \
  -d '{"agentId": "test-agent", "type": "assistant"}'

# Query the agent
curl -X POST http://localhost:3001/agent/test-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I create a platformer game?"}'
```

### Test Game Server

```bash
# Get server status
curl http://localhost:3002/status

# Create a game room
curl -X POST http://localhost:3002/room/create \
  -H "Content-Type: application/json" \
  -d '{"roomName": "My Room", "maxPlayers": 10}'
```

### Test Cloud Storage

```bash
# Upload a test asset (requires base64 encoded data)
curl -X POST http://localhost:3003/characters/char-001/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.txt", "fileData": "dGVzdA==", "fileType": "text/plain"}'

# List assets
curl http://localhost:3003/characters/char-001/assets
```

## 🎮 Using the Example Client

Run the included example client to see all services in action:

```bash
npm install
npm run example
```

This will:
- Connect to AI Agents service
- Create and query an AI agent
- Connect to Game Server
- Join as a player and move around
- Upload sample assets to Cloud Storage

## 📊 Monitoring

### View Logs

```bash
# Docker logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f ai-agents
docker-compose logs -f game-server
docker-compose logs -f cloud-storage
```

### Check Status

```bash
# Using deployment script
./deploy/deploy.sh status

# Using Docker
docker-compose ps

# Check health endpoints
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## 🛑 Stopping Services

```bash
# Stop Docker services
npm run docker:down

# Or using deployment script
./deploy/deploy.sh stop
```

## 🔧 Configuration

### Environment Variables

Key variables in `.env`:

```env
# AI Agents
OPENAI_API_KEY=your_key_here        # Optional for testing
AI_AGENT_PORT=3001

# Game Server
GAME_SERVER_PORT=3002
GAME_SERVER_MAX_PLAYERS=100

# Cloud Storage
CLOUD_STORAGE_PORT=3003
AWS_ACCESS_KEY_ID=your_key          # Optional for testing
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=gdevelop-assets

# Database
PUTER_DB_HOST=localhost
PUTER_DB_PORT=27017
```

### Testing Without API Keys

You can test the services without API keys:
- AI Agents will work but return mock responses
- Cloud Storage will need AWS credentials for actual S3 uploads

## 🐛 Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Check what's using the port
lsof -i :3001  # or :3002, :3003

# Stop the service using the port
docker-compose down
```

### Services Not Starting

```bash
# Check Docker is running
docker info

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker ps | grep mongodb

# Test MongoDB connection
docker exec -it gdevelop-mongodb mongosh
```

## 📚 Next Steps

- Read the [API Documentation](docs/API.md)
- Check the [Deployment Guide](docs/DEPLOYMENT.md) for production
- Review example code in `examples/client.js`
- Explore configuration files in `config/`

## 💡 Tips

1. **Development Mode**: Use `npm run dev` for auto-reload
2. **Individual Services**: Start only what you need with `npm run start:ai-agents`, etc.
3. **Logs**: Add `-f` to docker-compose logs to follow in real-time
4. **Clean Start**: Run `docker-compose down -v` to remove volumes and start fresh

## 🆘 Getting Help

- Check [CONTRIBUTING.md](CONTRIBUTING.md) for development setup
- Open an issue on GitHub
- Review the full documentation in `/docs`

---

Happy coding! 🎮✨
