/**
 * DIAGNOSTIC BUILD — import one module at a time to find the crash.
 * Once identified, the full Express app will be restored.
 */
import { log } from "../server/serverUtils";
import { isDatabaseConfigured } from "../server/db";
import { storage } from "../server/storage";
import { setupGrudgeAuth } from "../server/grudgeAuth";
import express from "express";

// If we get here, ALL imports survived module evaluation
log("All imports loaded OK");

export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    imports: ["serverUtils", "db", "storage", "grudgeAuth", "express"],
    dbConfigured: isDatabaseConfigured(),
  });
}
