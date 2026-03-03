/**
 * Grudge Auth Routes (GGE)
 * All authentication is delegated to the auth-gateway (source of truth).
 * This file proxies login/register/guest/puter requests and provides
 * JWT-verified /api/auth/* endpoints for the GGE client.
 */

import type { Express } from "express";
import { requireAuth } from "./middleware/grudgeJwt";

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://auth-gateway-flax.vercel.app";

// ── Proxy helper ──

async function gatewayProxy(
  endpoint: string,
  method: string,
  body?: Record<string, any>,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${AUTH_GATEWAY}/api/${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 503,
      data: { error: "Auth gateway unreachable", details: err.message },
    };
  }
}

// ── Route registration ──

export function setupGrudgeAuth(app: Express) {
  // ─── Proxy login to auth-gateway ───
  app.post("/api/login", async (req, res) => {
    const result = await gatewayProxy("login", "POST", req.body);
    res.status(result.status).json(result.data);
  });

  // ─── Proxy register to auth-gateway ───
  app.post("/api/register", async (req, res) => {
    const result = await gatewayProxy("register", "POST", req.body);
    res.status(result.status).json(result.data);
  });

  // ─── Proxy guest login to auth-gateway ───
  app.post("/api/guest", async (req, res) => {
    const result = await gatewayProxy("guest", "POST", req.body);
    res.status(result.status).json(result.data);
  });

  // ─── Puter sign-in → auth-gateway /api/puter → JWT ───
  // Client calls this after puter.auth.signIn() to get a Grudge JWT
  app.post("/api/auth/puter", async (req, res) => {
    const { puterUuid, puterUsername } = req.body;
    if (!puterUuid) {
      return res.status(400).json({ error: "puterUuid is required" });
    }
    const result = await gatewayProxy("puter", "POST", { puterUuid, puterUsername });
    res.status(result.status).json(result.data);
  });

  // ─── Verify token (proxy to auth-gateway /api/verify) ───
  app.get("/api/auth/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }
    const result = await gatewayProxy("verify", "GET", undefined, {
      Authorization: authHeader,
    });
    res.status(result.status).json(result.data);
  });

  // ─── Get current user (JWT-verified locally) ───
  app.get("/api/auth/user", requireAuth, (req, res) => {
    const user = req.grudgeUser!;
    res.json({
      id: user.userId,
      grudgeId: user.grudgeId,
      username: user.username,
      role: user.role || "user",
      isPremium: user.isPremium || false,
    });
  });

  // ─── Full profile (enriched from auth-gateway /api/verify) ───
  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const result = await gatewayProxy("verify", "GET", undefined, {
      Authorization: authHeader,
    });
    if (!result.ok) {
      return res.status(result.status).json(result.data);
    }
    res.json(result.data);
  });

  console.log("✅ Grudge Auth routes registered (gateway proxy mode)");
}
