const mongoose = require('mongoose');
require('dotenv').config();

class PuterDatabase {
  constructor() {
    this.connection = null;
    this.models = {};
    this.setupSchemas();
  }

  setupSchemas() {
    // Character Schema
    const characterSchema = new mongoose.Schema({
      characterId: { type: String, required: true, unique: true },
      userId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      class: { type: String, required: true },
      level: { type: Number, default: 1 },
      experience: { type: Number, default: 0 },
      stats: {
        health: { type: Number, default: 100 },
        mana: { type: Number, default: 100 },
        strength: { type: Number, default: 10 },
        agility: { type: Number, default: 10 },
        intelligence: { type: Number, default: 10 }
      },
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 0 },
        map: { type: String, default: 'spawn' }
      },
      inventory: [{
        itemId: String,
        quantity: Number,
        slot: Number
      }],
      equipment: {
        weapon: String,
        armor: String,
        helmet: String,
        boots: String,
        accessories: [String]
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Account Schema
    const accountSchema = new mongoose.Schema({
      userId: { type: String, required: true, unique: true },
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      characters: [{ type: String }],
      premium: { type: Boolean, default: false },
      premiumExpiry: { type: Date },
      currency: {
        gold: { type: Number, default: 0 },
        gems: { type: Number, default: 0 }
      },
      settings: {
        graphics: { type: String, default: 'medium' },
        sound: { type: Boolean, default: true },
        music: { type: Boolean, default: true }
      },
      createdAt: { type: Date, default: Date.now },
      lastLogin: { type: Date, default: Date.now }
    });

    // Asset Schema
    const assetSchema = new mongoose.Schema({
      assetId: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      type: { type: String, required: true }, // texture, model, sound, etc.
      category: { type: String, required: true },
      url: { type: String, required: true },
      metadata: {
        size: Number,
        format: String,
        dimensions: {
          width: Number,
          height: Number
        }
      },
      tags: [String],
      uploadedBy: { type: String, index: true },
      public: { type: Boolean, default: false },
      downloads: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    });

    // Hero Schema
    const heroSchema = new mongoose.Schema({
      heroId: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      title: { type: String },
      rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
      baseStats: {
        health: Number,
        attack: Number,
        defense: Number,
        speed: Number
      },
      abilities: [{
        abilityId: String,
        name: String,
        description: String,
        cooldown: Number,
        manaCost: Number
      }],
      unlockRequirements: {
        level: Number,
        currency: Number,
        questId: String
      },
      assetId: { type: String },
      createdAt: { type: Date, default: Date.now }
    });

    this.models.Character = mongoose.model('Character', characterSchema);
    this.models.Account = mongoose.model('Account', accountSchema);
    this.models.Asset = mongoose.model('Asset', assetSchema);
    this.models.Hero = mongoose.model('Hero', heroSchema);
  }

  async connect() {
    try {
      const host = process.env.PUTER_DB_HOST || 'localhost';
      const port = process.env.PUTER_DB_PORT || 27017;
      const dbName = process.env.PUTER_DB_NAME || 'gdevelop_assistant';
      const user = process.env.PUTER_DB_USER;
      const password = process.env.PUTER_DB_PASSWORD;

      let uri;
      if (user && password) {
        uri = `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=admin`;
      } else {
        uri = `mongodb://${host}:${port}/${dbName}`;
      }

      this.connection = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      console.log('Connected to Puter Database');
      return this.connection;
    } catch (error) {
      console.error('Failed to connect to Puter Database:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('Disconnected from Puter Database');
    }
  }

  // Character operations
  async createCharacter(characterData) {
    const character = new this.models.Character(characterData);
    return await character.save();
  }

  async getCharacter(characterId) {
    return await this.models.Character.findOne({ characterId });
  }

  async updateCharacter(characterId, updates) {
    return await this.models.Character.findOneAndUpdate(
      { characterId },
      { ...updates, updatedAt: Date.now() },
      { new: true }
    );
  }

  async deleteCharacter(characterId) {
    return await this.models.Character.findOneAndDelete({ characterId });
  }

  // Account operations
  async createAccount(accountData) {
    const account = new this.models.Account(accountData);
    return await account.save();
  }

  async getAccount(userId) {
    return await this.models.Account.findOne({ userId });
  }

  async updateAccount(userId, updates) {
    return await this.models.Account.findOneAndUpdate(
      { userId },
      updates,
      { new: true }
    );
  }

  // Asset operations
  async createAsset(assetData) {
    const asset = new this.models.Asset(assetData);
    return await asset.save();
  }

  async getAsset(assetId) {
    return await this.models.Asset.findOne({ assetId });
  }

  async getAssetsByType(type) {
    return await this.models.Asset.find({ type });
  }

  // Hero operations
  async createHero(heroData) {
    const hero = new this.models.Hero(heroData);
    return await hero.save();
  }

  async getHero(heroId) {
    return await this.models.Hero.findOne({ heroId });
  }

  async getHeroesByRarity(rarity) {
    return await this.models.Hero.find({ rarity });
  }
}

module.exports = PuterDatabase;

if (require.main === module) {
  const db = new PuterDatabase();
  db.connect().then(() => {
    console.log('Puter Database service running');
  }).catch(err => {
    console.error('Failed to start Puter Database service:', err);
    process.exit(1);
  });
}
