import { type Express } from "express";
import { verifyAuthToken, requireRegistered } from "../middleware/auth";
import { db } from "../db";
import { users, playerProfiles, playerWallets, playerCharacters } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerUserRoutes(app: Express) {
  /**
   * GET /api/user/profile
   * Get current user's profile with game data
   */
  app.get("/api/user/profile", verifyAuthToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get user data
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (userData.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get or create player profile
      let profile = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length === 0) {
        // Create default profile
        const newProfile = await db
          .insert(playerProfiles)
          .values({
            userId: req.user.id,
            displayName: userData[0].username,
            level: 1,
            xp: 0,
            totalGamesPlayed: 0,
            totalWins: 0,
          })
          .returning();

        profile = newProfile;
      }

      // Get wallet balances
      const wallets = await db
        .select()
        .from(playerWallets)
        .where(eq(playerWallets.playerId, profile[0].id));

      // Get owned characters count
      const ownedCharacters = await db
        .select()
        .from(playerCharacters)
        .where(eq(playerCharacters.playerId, profile[0].id));

      return res.status(200).json({
        user: {
          id: userData[0].id,
          username: userData[0].username,
          email: userData[0].email,
          firstName: userData[0].firstName,
          lastName: userData[0].lastName,
          profileImageUrl: userData[0].profileImageUrl,
          createdAt: userData[0].createdAt,
          isGuest: req.user.isGuest,
          isPremium: req.user.isPremium,
        },
        profile: {
          id: profile[0].id,
          displayName: profile[0].displayName,
          level: profile[0].level,
          xp: profile[0].xp,
          totalGamesPlayed: profile[0].totalGamesPlayed,
          totalWins: profile[0].totalWins,
        },
        stats: {
          totalCharacters: ownedCharacters.length,
          winRate: profile[0].totalGamesPlayed > 0 
            ? (profile[0].totalWins / profile[0].totalGamesPlayed * 100).toFixed(1)
            : "0.0",
        },
        wallets: wallets.map(w => ({
          currencyId: w.currencyId,
          balance: w.balance,
        })),
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  /**
   * PATCH /api/user/profile
   * Update user profile
   */
  app.patch("/api/user/profile", verifyAuthToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { displayName, firstName, lastName } = req.body;

      // Update user data
      if (firstName !== undefined || lastName !== undefined) {
        await db
          .update(users)
          .set({
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            updatedAt: new Date(),
          })
          .where(eq(users.id, req.user.id));
      }

      // Update player profile displayName
      if (displayName !== undefined) {
        const profile = await db
          .select()
          .from(playerProfiles)
          .where(eq(playerProfiles.userId, req.user.id))
          .limit(1);

        if (profile.length > 0) {
          await db
            .update(playerProfiles)
            .set({
              displayName,
              updatedAt: new Date(),
            })
            .where(eq(playerProfiles.id, profile[0].id));
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });

  /**
   * GET /api/user/characters
   * Get user's owned characters
   */
  app.get("/api/user/characters", verifyAuthToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get player profile
      const profile = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length === 0) {
        return res.status(200).json({ characters: [] });
      }

      // Get owned characters with details
      const ownedChars = await db
        .select()
        .from(playerCharacters)
        .where(eq(playerCharacters.playerId, profile[0].id));

      return res.status(200).json({
        characters: ownedChars,
      });
    } catch (error) {
      console.error("Error fetching characters:", error);
      return res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  /**
   * GET /api/user/stats
   * Get user's game statistics
   */
  app.get("/api/user/stats", verifyAuthToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get player profile
      const profile = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length === 0) {
        return res.status(200).json({
          level: 1,
          xp: 0,
          totalGamesPlayed: 0,
          totalWins: 0,
          winRate: 0,
        });
      }

      const p = profile[0];
      return res.status(200).json({
        level: p.level,
        xp: p.xp,
        totalGamesPlayed: p.totalGamesPlayed,
        totalWins: p.totalWins,
        winRate: p.totalGamesPlayed > 0 
          ? (p.totalWins / p.totalGamesPlayed * 100)
          : 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      return res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  /**
   * POST /api/user/upgrade-guest
   * Upgrade guest account to registered (requires being logged into auth-gateway)
   */
  app.post("/api/user/upgrade-guest", requireRegistered, async (req, res) => {
    // This endpoint only allows non-guest users
    // The middleware will reject guests automatically
    return res.status(200).json({
      success: true,
      message: "Account is already registered",
    });
  });

  console.log("✅ User routes registered");
}
