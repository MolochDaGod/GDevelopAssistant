/**
 * Serverless-safe utilities.
 * log() and serveStatic() extracted from vite.ts so that
 * api/index.ts (Vercel serverless function) does NOT pull in the
 * entire Vite dev toolchain at import time.
 *
 * server/index.ts (local dev) continues to import from vite.ts directly.
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const candidates = [
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];

  const distPath = candidates.find((p) => fs.existsSync(p));

  if (!distPath) {
    log(`Warning: No build directory found. Tried: ${candidates.join(", ")}`);
    return;
  }

  app.use(express.static(distPath));

  // SPA fallback
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
