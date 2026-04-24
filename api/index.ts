/**
 * Vercel Serverless API Entry Point
 *
 * All /api/* requests are routed here via vercel.json rewrites.
 * Exports the Express app from server/vercelApp.ts which handles:
 *  - Auth proxy, Health, Chat/AI, GRUDA Legion, DB CRUD, Meshy 3D
 *
 * Vercel's @vercel/node runtime auto-wraps the Express app as a serverless function.
 */

import app from "../server/vercelApp";

// Global error boundary — return JSON instead of crashing the serverless fn
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[API] Unhandled error:", err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      service: "grudgeDo
      timestamp: new Date().toISOString(),
    });
  }
});

export default app;
