/**
 * Load .env from app root (parent of server/) before any other code that needs process.env.
 * Must be imported first in index.js.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
