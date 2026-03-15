/**
 * Build check: fail if widget gzip size exceeds 30KB.
 */
import { readFileSync } from "fs";
import { gzipSync } from "zlib";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetPath = path.join(__dirname, "../../theme-extension/countdown-timer/assets/countdown-widget.js");
const MAX_GZIP_KB = 30;

const buf = readFileSync(assetPath);
const gzip = gzipSync(buf);
const kb = (gzip.length / 1024).toFixed(2);

if (gzip.length > MAX_GZIP_KB * 1024) {
  console.error(`Widget gzip size ${kb} KB exceeds ${MAX_GZIP_KB} KB limit.`);
  process.exit(1);
}
console.log(`Widget gzip size: ${kb} KB (limit ${MAX_GZIP_KB} KB)`);
