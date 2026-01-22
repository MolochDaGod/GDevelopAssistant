import type { Express } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql as drizzleSql } from "drizzle-orm";

/**
 * Grudge Standard Authentication
 * Compatible with Grudge Studio Auth Gateway
 * Shared database with Warlord-Crafting-Suite
 */

export function setupGrudgeAuth(app: Express) {
  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      // Find user
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (userResults.length === 0) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const user = userResults[0];

      // Verify password (handle both bcrypt hashes and plain passwords for migration)
      let isValid = false;
      if (user.password.startsWith("$2")) {
        // bcrypt hash
        isValid = await bcrypt.compare(password, user.password);
      } else {
        // Plain password (legacy)
        isValid = password === user.password;
      }

      if (!isValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Generate auth token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

      // Update last login
      await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return res.status(200).json({
        success: true,
        token,
        userId: user.id,
        username: user.username,
        displayName: user.firstName || user.username,
        isPremium: false,
        expiresAt,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      if (password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }

      // Check if username already exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ error: "Username already taken" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const newUsers = await db
        .insert(users)
        .values({
          username,
          password: passwordHash,
          email: email || null,
          firstName: username,
          lastName: null,
          profileImageUrl: null,
        })
        .returning({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
        });

      const user = newUsers[0];

      // Generate auth token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

      return res.status(201).json({
        success: true,
        token,
        userId: user.id,
        username: user.username,
        displayName: user.firstName,
        expiresAt,
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Guest access endpoint
  app.post("/api/guest", async (req, res) => {
    try {
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: "Device ID required" });
      }

      const guestUsername = `guest_${deviceId}`;

      // Check if guest user already exists
      let userResults = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
        })
        .from(users)
        .where(eq(users.username, guestUsername))
        .limit(1);

      let user;
      if (userResults.length === 0) {
        // Create new guest user
        const newUsers = await db
          .insert(users)
          .values({
            username: guestUsername,
            password: "guest",
            email: null,
            firstName: `Guest ${deviceId.slice(0, 6)}`,
            lastName: null,
            profileImageUrl: null,
          })
          .returning({
            id: users.id,
            username: users.username,
            firstName: users.firstName,
          });

        user = newUsers[0];
      } else {
        user = userResults[0];

        // Update last login
        await db
          .update(users)
          .set({ updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      // Generate guest token
      const token = "guest_" + crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

      return res.status(200).json({
        success: true,
        token,
        userId: user.id,
        username: user.username,
        displayName: user.firstName,
        isGuest: true,
        expiresAt,
      });
    } catch (error) {
      console.error("Guest login error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user from token (for compatibility)
  app.get("/api/auth/user", async (req, res) => {
    try {
      // Check for grudge auth token in header
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // For now, we'll use a simple token-to-userId mapping
      // In production, you'd store tokens in a database table
      // This is compatible with the auth-gateway localStorage pattern
      
      // Return mock user for now - implement proper token validation later
      return res.status(200).json({
        id: "local-user",
        username: "LocalPlayer",
        email: null,
        firstName: "Local",
        lastName: "Player",
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  console.log("✅ Grudge Auth routes registered");
}
