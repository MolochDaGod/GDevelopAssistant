/**
 * Grudge JWT Verification Middleware
 * Hub-and-spoke model: all tokens originate from auth-gateway (configurable via AUTH_GATEWAY_URL env)
 * This middleware verifies them locally (fast) or via auth-gateway (fallback).
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://auth-gateway-flax.vercel.app";

// SESSION_SECRET MUST match auth-gateway. If unset, local verify always fails → remote fallback.
const SESSION_SECRET = process.env.SESSION_SECRET || "";
if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  SESSION_SECRET not set — JWT local verification disabled, all requests will hit auth-gateway remotely");
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

/** Try local JWT verification first (no network round-trip). */
function verifyLocally(token: string): GrudgeUser | null {
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as Record<string, any>;
    if (!decoded.grudgeId) return null;
    return {
      grudgeId: decoded.grudgeId,
      username: decoded.username || "Player",
      userId: decoded.userId || decoded.sub || decoded.grudgeId,
    };
  } catch {
    return null;
  }
}

/** Fallback: call auth-gateway /api/verify to validate the token remotely. */
async function verifyRemotely(token: string): Promise<GrudgeUser | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${AUTH_GATEWAY}/api/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json() as Record<string, any>;
    if (!data.success || !data.grudgeId) return null;

    return {
      grudgeId: data.grudgeId,
      username: data.username || data.user?.username || "Player",
      userId: data.user?.id || data.grudgeId,
      role: data.user?.role,
      isPremium: data.user?.isPremium,
      isGuest: data.user?.isGuest,
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
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Fast path: local verify
  let user = verifyLocally(token);

  // Slow path: remote verify (handles key rotation, different secrets, etc.)
  if (!user) {
    user = await verifyRemotely(token);
  }

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
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    let user = verifyLocally(token);
    if (!user) {
      user = await verifyRemotely(token);
    }
    if (user) {
      req.grudgeUser = user;
    }
  }
  next();
}
