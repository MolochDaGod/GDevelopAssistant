import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { serveStatic, log } from "../server/vite";
import { storage } from "../server/storage";
import { setupGrudgeAuth } from "../server/grudgeAuth";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Setup auth
setupGrudgeAuth(app);
log("Grudge Authentication configured");

// Seed assets asynchronously without blocking function invocation
storage.seedAssets()
  .then(() => storage.seedRtsAssets())
  .then(() => storage.seedGameData())
  .then(() => log("Database seeded successfully"))
  .catch(err => {
    log("Warning: Database seeding failed (this is OK for serverless cold starts)");
    console.error(err);
  });

// Lazy-load and register routes on first request to avoid blocking cold start
let routesRegistered = false;
app.use(async (req, res, next) => {
  if (!routesRegistered) {
    try {
      const { registerRoutes } = await import("../server/routes");
      await registerRoutes(app);
      routesRegistered = true;
      log("Routes registered successfully");
    } catch (error) {
      console.error("Failed to register routes:", error);
      // Continue anyway - some routes may work
    }
  }
  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Request error:", err);
  res.status(status).json({ message });
});

// Serve static files in production
serveStatic(app);

log("Serverless function initialized");

// Export the Express app for Vercel
export default app;
