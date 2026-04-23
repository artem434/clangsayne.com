import fs from "node:fs";
import path from "node:path";

const mode = process.env.ADMIN_CONFIG || "local";
const source =
  mode === "production"
    ? "admin/config.production.yml"
    : "admin/config.yml";

const srcPath = path.join(process.cwd(), source);
const outPath = path.join(process.cwd(), "_site/admin/config.yml");

if (!fs.existsSync(srcPath)) {
  throw new Error(`Missing admin config source: ${source}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.copyFileSync(srcPath, outPath);
console.log(`[sync-admin-config] wrote ${outPath} from ${source}`);
