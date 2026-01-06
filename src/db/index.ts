import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Neon connection using HTTP driver (serverless-friendly)
const sql = neon(process.env.DATABASE_URL!);

// Drizzle instance with schema for type-safe queries
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export { schema };
