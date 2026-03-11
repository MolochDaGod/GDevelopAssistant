/**
 * Grudge JWT Verification Middleware
 * Direct-DB mode: all tokens are signed locally by grudgeAuth.ts.
 * Verified locally with SESSION_SECRET — no external gateway dependency.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "";
if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  SESSION_SECRET not set — JWT verification will fail for all requests");
}

/** Shape of the JWT payload issued by auth-gateway */
export interface GrudgeUser {
  grudgeId: string;
  username: string;
  userId: string;
  /** Set after remote verify enriches the payload */
  role?: string;
  isPremium?: boolean;
  isGuest?: boolean;
}

/** Extend Express Request to carry the decoded user */
declare global {
  namespace Express {
    interface Request {
      grudgeUser?: GrudgeUser;
    }
  }
}

// ── Helpers ──

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/** Verify JWT locally using SESSION_SECRET. */
function verifyToken(token: string): GrudgeUser | null {
  if (!SESSION_SECRET) return null;
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as Record<string, any>;
    if (!decoded.grudgeId) return null;
    return {
      grudgeId: decoded.grudgeId,
      username: decoded.username || "Player",
      userId: decoded.userId || decoded.sub || decoded.grudgeId,
      role: decoded.role,
      isPremium: decoded.isPremium,
      isGuest: decoded.isGuest,
    };
  } catch {
    return null;
  }
}

// ── Middleware Exports ──

/**
 * Require a valid Grudge JWT. Returns 401 if missing/invalid.
 * Attaches `req.grudgeUser` on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.grudgeUser = user;
  next();
}

/**
 * Optional auth — attaches `req.grudgeUser` if a valid token is present,
 * but continues even if not. Use for endpoints that work with or without auth.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.grudgeUser = user;
    }
  }
  next();
}
