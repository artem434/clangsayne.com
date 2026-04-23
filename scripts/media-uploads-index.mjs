/**
 * Flat index of all images under content/{1-about,2-news,...} into content/uploads/
 * as symlinks (or copies if symlinks fail). Decap Media lists only files directly in
 * media_folder — this makes every image visible there with a stable prefixed name.
 *
 * Run: npm run media:index
 * Commit the _idx__* entries in content/uploads/ so Git-backed CMS sees them too.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const UPLOADS = path.join(CONTENT, "uploads");
const PREFIX = "_idx__";

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
  ".bmp",
  ".heic",
]);

function isImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXT.has(ext);
}

/** Walk image files; skip anything under content/uploads (source, not index output). */
function walkImages(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const relFromContent = path.relative(CONTENT, full);
    if (relFromContent === "uploads" || relFromContent.startsWith(`uploads${path.sep}`)) {
      continue;
    }
    if (ent.isDirectory()) {
      walkImages(full, out);
    } else if (ent.isFile() && isImage(full)) {
      out.push(full);
    }
  }
}

function flatName(absFile) {
  const rel = path.relative(CONTENT, absFile).split(path.sep).join("/");
  const ext = path.extname(rel).toLowerCase() || ".jpg";
  let base = PREFIX + rel.replace(/\//g, "__").replace(/[^a-zA-Z0-9._-]/g, "_");
  if (base.length > 200) {
    const hash = createHash("sha256").update(rel).digest("hex").slice(0, 28);
    base = PREFIX + hash + ext;
  }
  return base;
}

function tryLinkOrCopy(targetAbs, linkAbs) {
  const rel = path.relative(path.dirname(linkAbs), targetAbs);
  try {
    fs.symlinkSync(rel, linkAbs);
    return "symlink";
  } catch {
    try {
      fs.copyFileSync(targetAbs, linkAbs);
      return "copy";
    } catch (e) {
      console.warn("skip", targetAbs, e.message);
      return "skip";
    }
  }
}

function main() {
  fs.mkdirSync(UPLOADS, { recursive: true });

  for (const name of fs.readdirSync(UPLOADS)) {
    if (name.startsWith(PREFIX)) {
      fs.rmSync(path.join(UPLOADS, name), { recursive: true, force: true });
    }
  }

  const images = [];
  for (const r of ["1-about", "2-news", "3-works", "5-shop", "6-press"]) {
    walkImages(path.join(CONTENT, r), images);
  }

  const used = new Set();
  let ok = 0;
  let skipped = 0;

  for (const abs of images) {
    let name = flatName(abs);
    if (used.has(name)) {
      const ext = path.extname(name);
      const stem = name.slice(0, -ext.length);
      let i = 2;
      while (used.has(`${stem}_${i}${ext}`)) i += 1;
      name = `${stem}_${i}${ext}`;
    }
    used.add(name);
    const linkPath = path.join(UPLOADS, name);
    const mode = tryLinkOrCopy(abs, linkPath);
    if (mode === "skip") skipped += 1;
    else ok += 1;
  }

  console.log(
    `media:index — ${ok} entries in ${path.relative(ROOT, UPLOADS)}/ (${PREFIX}*). ` +
      `${skipped ? skipped + " skipped. " : ""}` +
      `Decap → Media shows these at the uploads root. Commit symlinks for Git/Bridge.`
  );
}

main();
