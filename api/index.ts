import { setupApp } from '../server/app';
import db from '../server/db';
import { seedAssets } from '../server/asset-seeding';

// Initialize Express app
const app = setupApp();

// Seed assets on cold start (once)
let seeded = false;
if (!seeded) {
  seedAssets().catch(console.error);
  seeded = true;
}

// Export the Express app as a serverless function
export default app;
