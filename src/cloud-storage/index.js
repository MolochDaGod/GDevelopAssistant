const express = require('express');
const AWS = require('aws-sdk');
const path = require('path');
require('dotenv').config();

class CloudStorageService {
  constructor() {
    this.app = express();
    this.port = process.env.CLOUD_STORAGE_PORT || 3003;
    this.provider = process.env.CLOUD_STORAGE_PROVIDER || 'aws';
    this.bucket = process.env.AWS_S3_BUCKET || 'gdevelop-assets';
    this.basePath = process.env.CLOUD_STORAGE_PATH || 'game-assets';
    
    this.setupAWS();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupAWS() {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.s3 = new AWS.S3();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'cloud-storage' });
    });

    // Character assets
    this.app.post('/characters/:characterId/upload', async (req, res) => {
      try {
        const { characterId } = req.params;
        const { fileName, fileData, fileType } = req.body;
        
        const key = `${this.basePath}/characters/${characterId}/${fileName}`;
        const result = await this.uploadFile(key, fileData, fileType);
        
        res.json({
          success: true,
          url: result.Location,
          key: result.Key
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/characters/:characterId/assets', async (req, res) => {
      try {
        const { characterId } = req.params;
        const prefix = `${this.basePath}/characters/${characterId}/`;
        const files = await this.listFiles(prefix);
        res.json({ success: true, files });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Account assets
    this.app.post('/accounts/:userId/upload', async (req, res) => {
      try {
        const { userId } = req.params;
        const { fileName, fileData, fileType } = req.body;
        
        const key = `${this.basePath}/accounts/${userId}/${fileName}`;
        const result = await this.uploadFile(key, fileData, fileType);
        
        res.json({
          success: true,
          url: result.Location,
          key: result.Key
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Hero assets
    this.app.post('/heroes/:heroId/upload', async (req, res) => {
      try {
        const { heroId } = req.params;
        const { fileName, fileData, fileType } = req.body;
        
        const key = `${this.basePath}/heroes/${heroId}/${fileName}`;
        const result = await this.uploadFile(key, fileData, fileType);
        
        res.json({
          success: true,
          url: result.Location,
          key: result.Key
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/heroes/:heroId/assets', async (req, res) => {
      try {
        const { heroId } = req.params;
        const prefix = `${this.basePath}/heroes/${heroId}/`;
        const files = await this.listFiles(prefix);
        res.json({ success: true, files });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Game assets
    this.app.post('/assets/upload', async (req, res) => {
      try {
        const { category, fileName, fileData, fileType } = req.body;
        
        const key = `${this.basePath}/game/${category}/${fileName}`;
        const result = await this.uploadFile(key, fileData, fileType);
        
        res.json({
          success: true,
          url: result.Location,
          key: result.Key
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/assets/:category', async (req, res) => {
      try {
        const { category } = req.params;
        const prefix = `${this.basePath}/game/${category}/`;
        const files = await this.listFiles(prefix);
        res.json({ success: true, files });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Download file
    this.app.get('/download', async (req, res) => {
      try {
        const { key } = req.query;
        const url = await this.getSignedUrl(key);
        res.json({ success: true, url });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Delete file
    this.app.delete('/delete', async (req, res) => {
      try {
        const { key } = req.query;
        await this.deleteFile(key);
        res.json({ success: true, message: 'File deleted' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  async uploadFile(key, fileData, contentType) {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: Buffer.from(fileData, 'base64'),
      ContentType: contentType || 'application/octet-stream'
    };

    return await this.s3.upload(params).promise();
  }

  async listFiles(prefix) {
    const params = {
      Bucket: this.bucket,
      Prefix: prefix
    };

    const data = await this.s3.listObjectsV2(params).promise();
    return data.Contents.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified
    }));
  }

  async getSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }

  async deleteFile(key) {
    const params = {
      Bucket: this.bucket,
      Key: key
    };

    return await this.s3.deleteObject(params).promise();
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Cloud Storage Service running on port ${this.port}`);
      console.log(`Provider: ${this.provider}, Bucket: ${this.bucket}`);
    });
  }
}

module.exports = CloudStorageService;

if (require.main === module) {
  const service = new CloudStorageService();
  service.start();
}
