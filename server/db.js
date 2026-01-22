import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Initialize PostgreSQL connection with connection pooling
const sql = postgres(connectionString, {
  // Connection pool settings
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  
  // Performance settings
  statement_timeout: 30000,
  application_name: 'grudge-defense-game-engine',
  
  // SSL for secure connection in production
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
})

// Test connection on startup
if (process.env.NODE_ENV !== 'test') {
  sql`SELECT 1`
    .then(() => console.log('✓ Database connection established'))
    .catch(err => console.error('✗ Database connection failed:', err.message))
}

export default sql
