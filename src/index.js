const AIAgentServer = require('./ai-agents');
const GameServer = require('./game-server');
const PuterDatabase = require('./puter-db');
const CloudStorageService = require('./cloud-storage');
require('dotenv').config();

class GDevelopAssistant {
  constructor() {
    this.services = {
      database: null,
      aiAgents: null,
      gameServer: null,
      cloudStorage: null
    };
  }

  async start() {
    console.log('Starting GDevelop Assistant...');
    
    try {
      // Initialize Puter Database
      console.log('Initializing Puter Database...');
      this.services.database = new PuterDatabase();
      await this.services.database.connect();

      // Start AI Agents Server
      console.log('Starting AI Agents Server...');
      this.services.aiAgents = new AIAgentServer();
      this.services.aiAgents.start();

      // Start Game Server
      console.log('Starting Game Server...');
      this.services.gameServer = new GameServer();
      this.services.gameServer.start();

      // Start Cloud Storage Service
      console.log('Starting Cloud Storage Service...');
      this.services.cloudStorage = new CloudStorageService();
      this.services.cloudStorage.start();

      console.log('All services started successfully!');
      console.log('=====================================');
      console.log(`AI Agents: http://localhost:${process.env.AI_AGENT_PORT || 3001}`);
      console.log(`Game Server: http://localhost:${process.env.GAME_SERVER_PORT || 3002}`);
      console.log(`Cloud Storage: http://localhost:${process.env.CLOUD_STORAGE_PORT || 3003}`);
      console.log('=====================================');
    } catch (error) {
      console.error('Failed to start services:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('Shutting down GDevelop Assistant...');
    
    if (this.services.database) {
      await this.services.database.disconnect();
    }

    console.log('Shutdown complete');
  }
}

// Handle graceful shutdown
const assistant = new GDevelopAssistant();

process.on('SIGTERM', async () => {
  await assistant.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await assistant.shutdown();
  process.exit(0);
});

// Start the application
assistant.start();

module.exports = GDevelopAssistant;
