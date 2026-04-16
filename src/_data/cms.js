const fs = require("node:fs");
const path = require("node:path");

function readDir(dir) {
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .map((file) => {
      const full = path.join(abs, file);
      return JSON.parse(fs.readFileSync(full, "utf8"));
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function readFile(file) {
  const abs = path.join(process.cwd(), file);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

module.exports = {
  pages: {
    home: readFile("src/content/pages/home.json"),
    about: readFile("src/content/pages/about.json"),
    contact: readFile("src/content/pages/contact.json"),
    press: readFile("src/content/pages/press.json"),
    dates: readFile("src/content/pages/dates.json"),
    newsIndex: readFile("src/content/pages/news-index.json"),
    worksIndex: readFile("src/content/pages/works-index.json"),
    shopIndex: readFile("src/content/pages/shop-index.json"),
  },
  news: readDir("src/content/news"),
  works: readDir("src/content/works"),
  shop: readDir("src/content/shop"),
};
