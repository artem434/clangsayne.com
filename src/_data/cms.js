const fs = require("node:fs");
const path = require("node:path");

function readDir(dir, options = {}) {
  const { slugFromFilename = false } = options;
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .map((file) => {
      const full = path.join(abs, file);
      const data = JSON.parse(fs.readFileSync(full, "utf8"));
      if (
        slugFromFilename &&
        (typeof data.slug !== "string" || !String(data.slug).trim())
      ) {
        data.slug = path.basename(file, ".json");
      }
      return data;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function readFile(file) {
  const abs = path.join(process.cwd(), file);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

/** Decap may save paths with a leading slash; avoid `//` when prefixing in templates. */
function normalizeMediaPath(value) {
  if (typeof value !== "string") return value;
  return value.replace(/^\//, "").replace(/^\.\.\//, "");
}

function normalizeHomePage(data) {
  if (!data || typeof data !== "object") return data;
  data.heroImage = normalizeMediaPath(data.heroImage);
  return data;
}

function normalizeWorkEntry(item) {
  if (!item || typeof item !== "object") return item;
  item.heroImage = normalizeMediaPath(item.heroImage);
  return item;
}

module.exports = {
  pages: {
    home: normalizeHomePage(readFile("src/content/pages/home.json")),
    about: readFile("src/content/pages/about.json"),
    contact: readFile("src/content/pages/contact.json"),
    press: readFile("src/content/pages/press.json"),
    dates: readFile("src/content/pages/dates.json"),
    newsIndex: readFile("src/content/pages/news-index.json"),
    worksIndex: readFile("src/content/pages/works-index.json"),
    shopIndex: readFile("src/content/pages/shop-index.json"),
  },
  news: readDir("src/content/news", { slugFromFilename: true }),
  works: readDir("src/content/works", { slugFromFilename: true }).map(
    normalizeWorkEntry
  ),
  shop: readDir("src/content/shop", { slugFromFilename: true }),
};
