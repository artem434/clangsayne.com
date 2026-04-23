import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const mode = process.env.ADMIN_CONFIG || "local";
const basePath = path.join(process.cwd(), "admin/config.yml");
const outPath = path.join(process.cwd(), "_site/admin/config.yml");

if (!fs.existsSync(basePath)) {
  throw new Error(`Missing admin config: ${basePath}`);
}

const base = yaml.load(fs.readFileSync(basePath, "utf8"));
if (!base || typeof base !== "object") {
  throw new Error(`Invalid YAML in ${basePath}`);
}

if (mode === "production") {
  const overridePath = path.join(process.cwd(), "admin/config.production.yml");
  if (!fs.existsSync(overridePath)) {
    throw new Error(`Missing production overrides: ${overridePath}`);
  }
  const overrides = yaml.load(fs.readFileSync(overridePath, "utf8"));
  if (!overrides || typeof overrides !== "object") {
    throw new Error(`Invalid YAML in ${overridePath}`);
  }

  delete base.local_backend;
  if (overrides.backend) base.backend = overrides.backend;
  if (overrides.auth) base.auth = overrides.auth;
  if (overrides.logo_url !== undefined) base.logo_url = overrides.logo_url;
  if (overrides.site_url !== undefined) base.site_url = overrides.site_url;
  if (overrides.display_url !== undefined) base.display_url = overrides.display_url;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  yaml.dump(base, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  }),
  "utf8",
);
console.log(`[sync-admin-config] wrote ${outPath} (${mode})`);
