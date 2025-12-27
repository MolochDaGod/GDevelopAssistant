# GDevelop Assistant Deployment Guide

## Overview

GDevelop Assistant is a comprehensive platform for deploying AI agents, game servers, and cloud storage for game development. It includes:

- **AI Agents Service**: Manages AI-powered agents for game logic and player assistance
- **Game Server**: Handles multiplayer game sessions and real-time player interactions
- **Puter Database**: MongoDB-based database for storing characters, accounts, assets, and heroes
- **Cloud Storage**: AWS S3-based storage for game assets and player data

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GDevelop Assistant                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AI Agents   │  │ Game Server  │  │Cloud Storage │      │
│  │   :3001      │  │    :3002     │  │    :3003     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────┬───────┴──────────────────┘               │
│                   │                                           │
│         ┌─────────┴─────────┐                                │
│         │                   │                                │
│  ┌──────▼──────┐    ┌──────▼──────┐                         │
│  │   MongoDB   │    │    Redis    │                         │
│  │  (Puter DB) │    │   (Cache)   │                         │
│  └─────────────┘    └─────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### For Local Development (Docker)
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local testing)

### For Production (Kubernetes)
- Kubernetes cluster 1.25+
- kubectl configured
- Container registry access
- AWS account (for S3 storage)

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone https://github.com/MolochDaGod/GDevelopAssistant.git
cd GDevelopAssistant
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start all services

```bash
npm run docker:up
```

### 4. Verify services are running

```bash
# Check AI Agents
curl http://localhost:3001/health

# Check Game Server
curl http://localhost:3002/health

# Check Cloud Storage
curl http://localhost:3003/health
```

## Production Deployment (Kubernetes)

### 1. Build and push Docker image

```bash
docker build -t your-registry/gdevelop-assistant:latest .
docker push your-registry/gdevelop-assistant:latest
```

### 2. Create secrets

```bash
# Copy the example secrets file
cp deploy/kubernetes/secrets.yaml.example deploy/kubernetes/secrets.yaml

# Edit secrets.yaml with your actual credentials
# DO NOT commit this file!
```

### 3. Deploy to Kubernetes

```bash
# Create namespace and apply configurations
kubectl apply -f deploy/kubernetes/configmap.yaml
kubectl apply -f deploy/kubernetes/secrets.yaml

# Deploy databases
kubectl apply -f deploy/kubernetes/mongodb.yaml
kubectl apply -f deploy/kubernetes/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n gdevelop-assistant --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n gdevelop-assistant --timeout=300s

# Deploy services
kubectl apply -f deploy/kubernetes/ai-agents.yaml
kubectl apply -f deploy/kubernetes/game-server.yaml
kubectl apply -f deploy/kubernetes/cloud-storage.yaml
```

### 4. Verify deployment

```bash
# Check all pods
kubectl get pods -n gdevelop-assistant

# Check services
kubectl get services -n gdevelop-assistant

# Get external IPs
kubectl get services -n gdevelop-assistant -o wide
```

## Service Endpoints

### AI Agents Service (Port 3001)

- `GET /health` - Health check
- `GET /agents` - List all agents
- `POST /agent/create` - Create new AI agent
- `DELETE /agent/:agentId` - Delete an agent
- `POST /agent/:agentId/query` - Query an AI agent

### Game Server (Port 3002)

- `GET /health` - Health check
- `GET /status` - Server status
- `GET /rooms` - List game rooms
- `POST /room/create` - Create game room
- WebSocket for real-time game communication

### Cloud Storage (Port 3003)

- `GET /health` - Health check
- `POST /characters/:characterId/upload` - Upload character assets
- `GET /characters/:characterId/assets` - List character assets
- `POST /accounts/:userId/upload` - Upload account assets
- `POST /heroes/:heroId/upload` - Upload hero assets
- `POST /assets/upload` - Upload game assets
- `GET /download?key=` - Download file
- `DELETE /delete?key=` - Delete file

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `AI_AGENT_PORT` | AI Agents service port | 3001 |
| `GAME_SERVER_PORT` | Game server port | 3002 |
| `CLOUD_STORAGE_PORT` | Cloud storage port | 3003 |
| `OPENAI_API_KEY` | OpenAI API key for AI agents | - |
| `PUTER_DB_HOST` | MongoDB host | localhost |
| `PUTER_DB_PORT` | MongoDB port | 27017 |
| `PUTER_DB_NAME` | Database name | gdevelop_assistant |
| `PUTER_DB_USER` | Database user | admin |
| `PUTER_DB_PASSWORD` | Database password | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `AWS_REGION` | AWS region | us-east-1 |
| `AWS_S3_BUCKET` | S3 bucket name | gdevelop-assets |

## Database Schema

### Characters Collection
- characterId, userId, name, class, level, experience
- stats (health, mana, strength, agility, intelligence)
- position (x, y, z, map)
- inventory, equipment

### Accounts Collection
- userId, username, email, passwordHash
- characters (array of character IDs)
- premium status, currency (gold, gems)
- settings

### Assets Collection
- assetId, name, type, category, url
- metadata (size, format, dimensions)
- tags, uploadedBy, downloads

### Heroes Collection
- heroId, name, title, rarity
- baseStats, abilities
- unlockRequirements, assetId

## Scaling

### Horizontal Scaling

The deployment is designed to scale horizontally:

```bash
# Scale AI Agents
kubectl scale deployment ai-agents --replicas=5 -n gdevelop-assistant

# Scale Game Server
kubectl scale deployment game-server --replicas=10 -n gdevelop-assistant

# Scale Cloud Storage
kubectl scale deployment cloud-storage --replicas=3 -n gdevelop-assistant
```

### Auto-scaling

Create HorizontalPodAutoscaler:

```bash
kubectl autoscale deployment ai-agents --cpu-percent=70 --min=2 --max=10 -n gdevelop-assistant
kubectl autoscale deployment game-server --cpu-percent=70 --min=3 --max=20 -n gdevelop-assistant
kubectl autoscale deployment cloud-storage --cpu-percent=70 --min=2 --max=8 -n gdevelop-assistant
```

## Monitoring

### Health Checks

All services expose `/health` endpoints for monitoring:

```bash
# Monitor all services
watch -n 5 'curl -s http://localhost:3001/health && curl -s http://localhost:3002/health && curl -s http://localhost:3003/health'
```

### Logs

```bash
# View logs in Docker
docker-compose logs -f

# View logs in Kubernetes
kubectl logs -f deployment/ai-agents -n gdevelop-assistant
kubectl logs -f deployment/game-server -n gdevelop-assistant
kubectl logs -f deployment/cloud-storage -n gdevelop-assistant
```

## Troubleshooting

### Services not starting

1. Check environment variables are set correctly
2. Verify database connectivity
3. Check logs for error messages

### Database connection issues

```bash
# Test MongoDB connection
docker exec -it gdevelop-mongodb mongosh -u admin -p admin123

# In Kubernetes
kubectl exec -it deployment/mongodb -n gdevelop-assistant -- mongosh -u admin -p <password>
```

### Cloud storage issues

1. Verify AWS credentials are correct
2. Check S3 bucket exists and has proper permissions
3. Verify AWS region is correct

## Security Considerations

1. **Never commit secrets** - Use `.gitignore` to exclude `.env` and `secrets.yaml`
2. **Use strong passwords** - Change default passwords in production
3. **Enable TLS** - Configure HTTPS for production deployments
4. **Restrict network access** - Use Kubernetes NetworkPolicies
5. **Regular updates** - Keep dependencies updated

## Support

For issues and questions:
- GitHub Issues: https://github.com/MolochDaGod/GDevelopAssistant/issues
- Documentation: Check the `/docs` directory

## License

MIT License - See LICENSE file for details
