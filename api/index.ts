import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { serveStatic, log } from "../server/serverUtils";
import { storage } from "../server/storage";
import { isDatabaseConfigured } from "../server/db";
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

// Auth routes proxy to auth-gateway — no DB required
setupGrudgeAuth(app);
log("Grudge Authentication configured (gateway proxy mode)");

// Seed database if configured (optional — games still work without DB)
if (isDatabaseConfigured()) {
  storage.seedAssets()
    .then(() => storage.seedRtsAssets())
    .then(() => storage.seedGameData())
    .then(() => log("Database seeded successfully"))
    .catch(err => {
      log("Warning: Database seeding failed (this is OK for serverless cold starts)");
      console.error(err);
    });
} else {
  log("Warning: DATABASE_URL not set - running without database (games still work)");
}

// Lazy-load API-only routes on first request (skips HTTP server + Socket.IO creation)
let routesRegistered = false;
app.use(async (req, res, next) => {
  if (!routesRegistered) {
    try {
      const { registerRoutes } = await import("../server/routes");
      // registerRoutes returns an HTTP server (for local dev), but we
      // don't need it in serverless — Vercel provides its own.
      // The route handlers are still registered on `app`.
      await registerRoutes(app);
      routesRegistered = true;
      log("Routes registered successfully");
    } catch (error) {
      console.error("Failed to register routes:", error);
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
