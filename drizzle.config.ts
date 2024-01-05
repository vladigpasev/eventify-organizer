import type { Config } from 'drizzle-kit';

export default {
  schema: './schema/*',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL + "?sslmode=require",
  },
  
} satisfies Config;