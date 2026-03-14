import { type Request, type Response, type NextFunction } from "express";

// Extended Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        displayName: string;
        email?: string;
        isPremium: boolean;
        isGuest: boolean;
      };
    }
  }
}

const AUTH_BACKEND = process.env.GRUDGE_BACKEND_URL || "https://id.grudge-studio.com";

/**
 * Middleware to verify JWT/token via the Grudge auth backend.
 * Tokens are verified by calling the auth-gateway's /auth/verify endpoint
 * instead of connecting to the database directly.
 */
export async function verifyAuthToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token via the Grudge auth backend
    const upstream = await fetch(`${AUTH_BACKEND}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
    });

    if (!upstream.ok) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const data = await upstream.json();

    if (!data.success || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = data.user;

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.displayName || user.username,
      email: user.email || undefined,
      isPremium: user.is_premium || user.isPremium || false,
      isGuest: user.is_guest || user.isGuest || false,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    // Try to verify, but don't fail if it doesn't work
    await verifyAuthToken(req, res, (err?: any) => {
      if (err) {
        console.warn("Optional auth failed:", err);
      }
      next();
    });
  } catch (error) {
    console.warn("Optional auth error:", error);
    next();
  }
}

/**
 * Require premium user
 */
export function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isPremium) {
    return res.status(403).json({ error: "Premium account required" });
  }

  next();
}

/**
 * Require non-guest user
 */
export function requireRegistered(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.isGuest) {
    return res.status(403).json({ error: "Registered account required" });
  }

  next();
}
