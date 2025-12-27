# GDevelop Assistant

> Complete deployment infrastructure for AI agents, game servers, and cloud storage for game development

## 🎮 Overview

GDevelop Assistant is a comprehensive platform that provides:

- **AI Agents Service** - Intelligent agents for game logic, NPCs, and player assistance
- **Game Server** - Real-time multiplayer game server with WebSocket support
- **Puter Database** - MongoDB-based storage for characters, accounts, assets, and heroes
- **Cloud Storage** - AWS S3 integration for storing game assets and player data

## 🚀 Features

### AI Agents
- Create and manage multiple AI agents
- Real-time query processing
- WebSocket support for live interactions
- Configurable AI models (GPT-4, etc.)

### Game Server
- Real-time multiplayer support
- Room-based game sessions
- Player position tracking
- Configurable tick rate (default 60Hz)
- Support for up to 100 concurrent players per server instance

### Puter Database
- Character management with stats, inventory, and equipment
- Account system with premium features
- Asset management and categorization
- Hero system with abilities and unlock requirements

### Cloud Storage
- AWS S3 integration
- Character, account, and hero asset storage
- Signed URLs for secure downloads
- Organized file structure

## 📋 Prerequisites

- **Docker** 20.10+ and Docker Compose 2.0+ (for local deployment)
- **Node.js** 18+ (for local development)
- **Kubernetes** 1.25+ (for production deployment)
- **AWS Account** (for cloud storage)

## 🏃 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/MolochDaGod/GDevelopAssistant.git
cd GDevelopAssistant
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration (API keys, database credentials, etc.)
```

### 3. Run with Docker

```bash
# Start all services
npm run docker:up

# Or manually with Docker Compose
docker-compose up -d
```

### 4. Verify services

```bash
# Check AI Agents
curl http://localhost:3001/health

# Check Game Server
curl http://localhost:3002/health

# Check Cloud Storage
curl http://localhost:3003/health
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              GDevelop Assistant                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ AI Agents  │ │Game Server │ │   Cloud    │  │
│  │   :3001    │ │   :3002    │ │  Storage   │  │
│  │            │ │            │ │   :3003    │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘  │
│        │              │              │          │
│        └──────┬───────┴──────────────┘          │
│               │                                  │
│      ┌────────┴────────┐                        │
│      │                 │                        │
│  ┌───▼────┐      ┌────▼─────┐                  │
│  │MongoDB │      │  Redis   │                  │
│  │(Puter) │      │ (Cache)  │                  │
│  └────────┘      └──────────┘                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Complete deployment instructions
- [API Documentation](docs/API.md) - Detailed API reference

## 🔧 Available Scripts

```bash
# Development
npm start              # Start all services
npm run dev           # Start with auto-reload

# Individual services
npm run start:ai-agents      # Start AI Agents only
npm run start:game-server    # Start Game Server only
npm run start:puter-db       # Start Puter Database only
npm run start:cloud-storage  # Start Cloud Storage only

# Docker
npm run docker:build  # Build Docker images
npm run docker:up     # Start all containers
npm run docker:down   # Stop all containers
npm run deploy:local  # Deploy locally with Docker

# Kubernetes
npm run deploy:prod   # Deploy to Kubernetes
```

## 🌐 Service Endpoints

| Service | Port | Endpoint | Description |
|---------|------|----------|-------------|
| AI Agents | 3001 | `/health` | Health check |
| AI Agents | 3001 | `/agents` | List agents |
| AI Agents | 3001 | `/agent/create` | Create agent |
| Game Server | 3002 | `/health` | Health check |
| Game Server | 3002 | `/status` | Server status |
| Game Server | 3002 | `/rooms` | List game rooms |
| Cloud Storage | 3003 | `/health` | Health check |
| Cloud Storage | 3003 | `/characters/:id/upload` | Upload character asset |
| Cloud Storage | 3003 | `/heroes/:id/upload` | Upload hero asset |

## 🗄️ Database Schema

### Characters
- Character details (name, class, level, experience)
- Stats (health, mana, strength, agility, intelligence)
- Position and map information
- Inventory and equipment

### Accounts
- User credentials and profile
- Character references
- Premium status and currency
- Settings and preferences

### Assets
- Asset metadata (name, type, category)
- Storage URLs and file information
- Tags and ownership

### Heroes
- Hero information (name, title, rarity)
- Base stats and abilities
- Unlock requirements

## 🚢 Production Deployment

Deploy to Kubernetes:

```bash
# Build and push image
docker build -t your-registry/gdevelop-assistant:latest .
docker push your-registry/gdevelop-assistant:latest

# Configure secrets
cp deploy/kubernetes/secrets.yaml.example deploy/kubernetes/secrets.yaml
# Edit secrets.yaml with your credentials

# Deploy
kubectl apply -f deploy/kubernetes/configmap.yaml
kubectl apply -f deploy/kubernetes/secrets.yaml
kubectl apply -f deploy/kubernetes/mongodb.yaml
kubectl apply -f deploy/kubernetes/redis.yaml
kubectl apply -f deploy/kubernetes/ai-agents.yaml
kubectl apply -f deploy/kubernetes/game-server.yaml
kubectl apply -f deploy/kubernetes/cloud-storage.yaml
```

## 🔐 Security

- Use strong passwords for production databases
- Keep API keys and secrets in environment variables (never commit them)
- Enable HTTPS/TLS for production deployments
- Use Kubernetes NetworkPolicies to restrict access
- Regularly update dependencies

## 📊 Monitoring

All services expose health check endpoints:

```bash
# AI Agents
curl http://localhost:3001/health

# Game Server  
curl http://localhost:3002/status

# Cloud Storage
curl http://localhost:3003/health
```

## 🐛 Troubleshooting

### Services won't start
- Check environment variables in `.env`
- Verify Docker is running
- Check logs: `docker-compose logs -f`

### Database connection issues
- Verify MongoDB is running: `docker ps | grep mongodb`
- Check credentials in `.env`
- Test connection: `docker exec -it gdevelop-mongodb mongosh`

### Cloud storage issues
- Verify AWS credentials are correct
- Check S3 bucket exists and has proper permissions
- Verify AWS region matches your bucket

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 👥 Authors

Built for GDevelop game development community

## 🔗 Links

- [GDevelop](https://gdevelop.io/)
- [Documentation](docs/)
- [Issues](https://github.com/MolochDaGod/GDevelopAssistant/issues)
