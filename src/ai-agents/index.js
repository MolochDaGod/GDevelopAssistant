const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

class AIAgentServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    this.port = process.env.AI_AGENT_PORT || 3001;
    this.agents = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'ai-agents' });
    });

    this.app.get('/agents', (req, res) => {
      res.json({
        agents: Array.from(this.agents.values()),
        count: this.agents.size
      });
    });

    this.app.post('/agent/create', async (req, res) => {
      try {
        const { agentId, type, config } = req.body;
        const agent = {
          id: agentId || `agent-${Date.now()}`,
          type: type || 'general',
          config: config || {},
          status: 'active',
          createdAt: new Date()
        };
        this.agents.set(agent.id, agent);
        res.json({ success: true, agent });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.delete('/agent/:agentId', (req, res) => {
      const { agentId } = req.params;
      if (this.agents.has(agentId)) {
        this.agents.delete(agentId);
        res.json({ success: true, message: 'Agent deleted' });
      } else {
        res.status(404).json({ success: false, error: 'Agent not found' });
      }
    });

    this.app.post('/agent/:agentId/query', async (req, res) => {
      try {
        const { agentId } = req.params;
        const { query } = req.body;
        
        if (!this.agents.has(agentId)) {
          return res.status(404).json({ success: false, error: 'Agent not found' });
        }

        // Simulate AI processing
        const response = await this.processAIQuery(agentId, query);
        res.json({ success: true, response });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected to AI Agent service:', socket.id);

      socket.on('agent:register', (data) => {
        const agent = {
          id: data.agentId || `agent-${socket.id}`,
          socketId: socket.id,
          type: data.type || 'general',
          status: 'connected',
          connectedAt: new Date()
        };
        this.agents.set(agent.id, agent);
        socket.emit('agent:registered', agent);
      });

      socket.on('agent:query', async (data) => {
        try {
          const response = await this.processAIQuery(data.agentId, data.query);
          socket.emit('agent:response', { query: data.query, response });
        } catch (error) {
          socket.emit('agent:error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove agents associated with this socket
        for (const [agentId, agent] of this.agents.entries()) {
          if (agent.socketId === socket.id) {
            this.agents.delete(agentId);
          }
        }
      });
    });
  }

  async processAIQuery(agentId, query) {
    // This is a placeholder for AI processing
    // In production, this would integrate with OpenAI or other AI services
    return {
      agentId,
      query,
      answer: `AI Agent ${agentId} processed: ${query}`,
      timestamp: new Date(),
      model: process.env.AI_AGENT_MODEL || 'gpt-4'
    };
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`AI Agent Server running on port ${this.port}`);
    });
  }
}

module.exports = AIAgentServer;

if (require.main === module) {
  const server = new AIAgentServer();
  server.start();
}
