// Load .env.local before .env, matching Next.js's own precedence (.env.local
// wins). Must be imported before anything that reads process.env at module
// scope (e.g. src/lib/db.ts), and must be its own module — a plain function
// call placed after another static import runs too late, since TS hoists all
// import statements above other top-level code in the emitted file.
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
