/**
 * Grudge Auth Routes — Proxy to Grudge Backend API
 *
 * All auth flows are forwarded to the Grudge backend at GRUDGE_BACKEND_URL.
 * No direct DB connection from Vercel — the backend owns the database.
 *
 * JWT tokens are issued by the Grudge backend and passed through to the client.
 */

import type { Express, Request, Response } from "express";

const BACKEND = process.env.GRUDGE_BACKEND_URL || "https://api.grudge-studio.com";

// Generic proxy helper — forwards request to the Grudge backend and returns the response
async function proxyToBackend(
  backendPath: string,
  req: Request,
  res: Response,
  { method = "POST", forwardBody = true } = {},
) {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization as string;
    }

    const fetchOpts: RequestInit = { method, headers };
    if (forwardBody && method !== "GET") {
      fetchOpts.body = JSON.stringify(req.body || {});
    }

    const upstream = await fetch(`${BACKEND}${backendPath}`, fetchOpts);
    const contentType = upstream.headers.get("content-type") || "";

    // Handle redirects (Google OAuth callback)
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (location) return res.redirect(upstream.status, location);
    }

    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } else {
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    }
  } catch (err: any) {
    console.error(`[Proxy ${backendPath}] error:`, err.message);
    res.status(502).json({
      error: "Backend unavailable",
      service: "GDevelop Assistant",
      hint: "Grudge backend at " + BACKEND + " may be offline",
    });
  }
}

export function setupGrudgeAuth(app: Express) {
  // GET /api/login & /api/register → redirect to in-app auth page
  app.get("/api/login", (_req, res) => res.redirect(302, "/auth"));
  app.get("/api/register", (_req, res) => res.redirect(302, "/auth"));

  // ── Auth proxies ──
  app.post("/api/login", (req, res) => proxyToBackend("/api/auth/login", req, res));
  app.post("/api/register", (req, res) => proxyToBackend("/api/auth/register", req, res));
  app.post("/api/guest", (req, res) => proxyToBackend("/api/auth/guest", req, res));

  app.get("/api/auth/verify", (req, res) => proxyToBackend("/api/auth/verify", req, res, { method: "GET", forwardBody: false }));
  app.get("/api/auth/user", (req, res) => proxyToBackend("/api/auth/user", req, res, { method: "GET", forwardBody: false }));
  app.get("/api/auth/me", (req, res) => proxyToBackend("/api/auth/me", req, res, { method: "GET", forwardBody: false }));

  app.post("/api/auth/puter", (req, res) => proxyToBackend("/api/auth/puter", req, res));
  app.post("/api/auth/link-puter", (req, res) => proxyToBackend("/api/auth/link-puter", req, res));
  app.post("/api/auth/wallet", (req, res) => proxyToBackend("/api/auth/wallet", req, res));
  app.post("/api/auth/discord", (req, res) => proxyToBackend("/api/auth/discord", req, res));
  app.post("/api/auth/logout", (req, res) => proxyToBackend("/api/auth/logout", req, res));

  app.get("/api/auth/google", (req, res) => proxyToBackend("/api/auth/google", req, res, { method: "GET", forwardBody: false }));
  app.get("/api/auth/google/callback", (req, res) => {
    // Forward the full query string to the backend
    const qs = req.url.includes("?") ? req.url.split("?")[1] : "";
    proxyToBackend(`/api/auth/google/callback?${qs}`, req, res, { method: "GET", forwardBody: false });
  });

  console.log(`✅ Grudge Auth proxy registered → ${BACKEND}`);
}
