import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const CONTENT = path.join(SRC, "content");

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function writeJson(relPath, data) {
  const abs = path.join(ROOT, relPath);
  ensure(path.dirname(abs));
  fs.writeFileSync(abs, JSON.stringify(data, null, 2) + "\n");
}

function capture(html, re, group = 1) {
  const match = html.match(re);
  return match ? match[group] : "";
}

function captureAll(html, re, group = 1) {
  const out = [];
  for (const match of html.matchAll(re)) out.push(match[group]);
  return out;
}

function decodeEntities(str = "") {
  const named = {
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&euro;": "€",
    "&mdash;": "—",
    "&ndash;": "–",
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&rdquo;": "”",
    "&ldquo;": "“",
  };
  let value = str;
  for (const [entity, replacement] of Object.entries(named)) {
    value = value.split(entity).join(replacement);
  }
  value = value.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  return value;
}

function extractInnerDiv(html, className) {
  const re = new RegExp(
    `<div[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\/div>`,
    "i"
  );
  return capture(html, re);
}

function stripNextPrev(html) {
  return html.replace(/<nav class="nextprev[\s\S]*$/i, "").trim();
}

function extractBodyAfterHeading(html) {
  const afterHeading = html.replace(/^[\s\S]*?<\/h1>/i, "");
  return stripNextPrev(afterHeading);
}

function extractFigures(html) {
  const figures = [];
  const regex =
    /<figure>\s*<img src="([^"]+)" alt="([^"]*)"\s*>\s*<\/figure>/gi;
  for (const match of html.matchAll(regex)) {
    figures.push({ src: normalizePath(match[1]), alt: decodeEntities(match[2]) });
  }
  return figures;
}

function firstImage(html) {
  const match = html.match(/<img src="([^"]+)" alt="([^"]*)"/i);
  if (!match) return null;
  return { src: normalizePath(match[1]), alt: decodeEntities(match[2]) };
}

function normalizePath(src = "") {
  return src.replace(/^\.\.\//, "").replace(/^\.\//, "").replace(/^\/+/, "");
}

function safeTrim(html) {
  return html.replace(/\r\n/g, "\n").trim();
}

function normalizeHtmlPaths(html = "") {
  return html
    .replace(/src="\.\.\/content\//g, 'src="/content/')
    .replace(/src="content\//g, 'src="/content/')
    .replace(/src="\.\.\/assets\//g, 'src="/assets/')
    .replace(/src="assets\//g, 'src="/assets/')
    .replace(/href="\.\.\//g, 'href="/');
}

function parseNewsIndex() {
  const html = read("news.html");
  const ul = capture(html, /<ul class="teaser cf">([\s\S]*?)<\/ul>/i);
  const items = [];
  const lis = ul.match(/<li>[\s\S]*?<\/li>/gi) || [];
  lis.forEach((li, index) => {
    const href = capture(li, /<a href="news\/([^"]+)"/i);
    const title = decodeEntities(capture(li, /<h2><a href="[^"]+">([\s\S]*?)<\/a><\/h2>/i));
    const date = decodeEntities(
      capture(li, /<p class="news_index_date"><a href="[^"]+">([\s\S]*?)<\/a><\/p>/i)
    );
    const excerpt = decodeEntities(
      capture(li, /<p class="news_excerpt"><a href="[^"]+">([\s\S]*?)<\/a><\/p>/i)
    );
    const img = capture(li, /<img src="([^"]+)" alt="([^"]*)"/i);
    items.push({
      slug: href.replace(/\.html$/i, ""),
      order: index + 1,
      title,
      date,
      excerpt,
      heroImage: normalizePath(img || ""),
      heroAlt: decodeEntities(capture(li, /<img src="[^"]+" alt="([^"]*)"/i)),
    });
  });
  writeJson("src/content/pages/news-index.json", {
    title: "News",
    bodyHtml: "",
  });
  return items;
}

function parseDetailPage(fileRel, type) {
  const html = read(fileRel);
  const pageRight = extractInnerDiv(html, "page_right");
  const pageLeft = extractInnerDiv(html, "page_left");
  const heroImage = firstImage(pageLeft) || firstImage(pageRight);
  const figures = extractFigures(pageLeft);
  const title = decodeEntities(
    capture(pageRight || pageLeft, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      capture(html, /<title>Clang Sayne \| ([^<]+)<\/title>/i)
  );
  const date = decodeEntities(capture(pageRight, /<p>([\s\S]*?)<\/p>/i));
  const bodyHtml = safeTrim(extractBodyAfterHeading(pageRight));
  const next = capture(html, /<a class="next" href="([^"]+)"/i);
  const prev = capture(html, /<a class="prev" href="([^"]+)"/i);

  const slug = path.basename(fileRel, ".html");
  const result = {
    slug,
    title,
    date,
    heroImage: heroImage?.src || "",
    heroAlt: heroImage?.alt || title,
    heroImages: figures.length ? figures : heroImage ? [heroImage] : [],
    bodyHtml: normalizeHtmlPaths(bodyHtml),
    nextSlug: next ? next.replace(/\.html$/i, "") : "",
    prevSlug: prev ? prev.replace(/\.html$/i, "") : "",
  };

  if (type === "works") {
    result.heroTitle = decodeEntities(
      capture(pageLeft, /<div class="page_left altleftmin">[\s\S]*?<h1>([\s\S]*?)<\/h1>/i) ||
        title
    );
  }

  if (type === "shop") {
    result.subtitle = "";
    result.bodyHtml = normalizeHtmlPaths(safeTrim(extractBodyAfterHeading(pageRight)));
  }

  return result;
}

/** Cover thumbnails and list order from root `works.html` (used on /works.html grid). */
function parseWorksListCovers() {
  const html = read("works.html");
  const ul = capture(html, /<ul class="works cf">([\s\S]*?)<\/ul>/i);
  const map = new Map();
  const order = [];
  for (const li of ul.match(/<li>[\s\S]*?<\/li>/gi) || []) {
    const href = capture(li, /<a href="works\/([^"]+)"/i);
    const src = capture(li, /<img src="([^"]+)"/i);
    const alt = decodeEntities(capture(li, /<img src="[^"]+" alt="([^"]*)"/i));
    if (href) {
      const slug = href.replace(/\.html$/i, "");
      map.set(slug, { src: normalizePath(src || ""), alt: alt || "" });
      order.push(slug);
    }
  }
  return { map, order };
}

function parseListingPage(fileRel, type) {
  const html = read(fileRel);
  const body = extractInnerDiv(html, "main");
  if (type === "dates") {
    return {
      title: "Dates",
      bodyHtml: safeTrim(capture(html, /<ul class="dateslisting cf">([\s\S]*?)<\/ul>/i)),
    };
  }
  if (type === "works") {
    const items = capture(html, /<ul class="works cf">([\s\S]*?)<\/ul>/i);
    return { title: "Works", bodyHtml: safeTrim(items) };
  }
  if (type === "shop") {
    const items = capture(html, /<ul class="records cf">([\s\S]*?)<\/ul>/i);
    return { title: "Shop", bodyHtml: safeTrim(items) };
  }
  return { title: "", bodyHtml: safeTrim(body || "") };
}

function parseHome() {
  const html = read("index.html");
  return {
    title: "Home",
    heroImage: "content/uploads/ss_motifs_x_5-fullscreen.jpg",
    heroImageAlt: "Clang Sayne motifs",
    ctaHtml: normalizeHtmlPaths(
      safeTrim(capture(html, /<div id="playandwatch">([\s\S]*?)<\/div>\s*<\/div>\s*$/i) || "")
    ),
  };
}

function parseStaticPage(fileRel, type) {
  const html = read(fileRel);
  const pageLeft = extractInnerDiv(html, "page_left");
  const pageRight = extractInnerDiv(html, "page_right");
  const hero = extractInnerDiv(html, "hero_image");
  const single = extractInnerDiv(html, "single_column");
  const title = decodeEntities(
    capture(html, /<title>Clang Sayne \| ([^<]+)<\/title>/i) || type
  );
  return {
    title,
    heroHtml: normalizeHtmlPaths(safeTrim(hero ? `<div class="hero_image">${hero}</div>` : "")),
    leftHtml: normalizeHtmlPaths(safeTrim(pageLeft)),
    bodyHtml: normalizeHtmlPaths(safeTrim(pageRight || single)),
  };
}

function main() {
  ensure(CONTENT);

  const home = parseHome();
  writeJson("src/content/pages/home.json", home);

  const about = parseStaticPage("about.html", "About");
  writeJson("src/content/pages/about.json", about);

  const contact = parseStaticPage("contact.html", "Contact");
  writeJson("src/content/pages/contact.json", contact);

  const press = parseStaticPage("press.html", "Press");
  writeJson("src/content/pages/press.json", press);

  const dates = parseListingPage("dates.html", "dates");
  writeJson("src/content/pages/dates.json", dates);

  writeJson("src/content/pages/works-index.json", parseListingPage("works.html", "works"));
  writeJson("src/content/pages/shop-index.json", parseListingPage("shop.html", "shop"));

  const newsOrder = parseNewsIndex();
  const newsList = [];
  for (const file of fs.readdirSync(path.join(ROOT, "news")).filter((f) => f.endsWith(".html"))) {
    const item = parseDetailPage(path.join("news", file), "news");
    const teaser = newsOrder.find((entry) => entry.slug === item.slug);
    newsList.push({
      ...item,
      order: teaser ? teaser.order : newsList.length + 1,
      excerpt: teaser?.excerpt || item.bodyHtml.split("</p>")[0].replace(/<[^>]*>/g, ""),
      heroImage: teaser?.heroImage || item.heroImage,
      heroAlt: teaser?.heroAlt || item.heroAlt,
    });
  }
  newsList.sort((a, b) => a.order - b.order);
  newsList.forEach((item) => {
    writeJson(`src/content/news/${item.slug}.json`, item);
  });

  const { map: worksCovers, order: worksListOrder } = parseWorksListCovers();
  const works = [];
  for (const file of fs.readdirSync(path.join(ROOT, "works")).filter((f) => f.endsWith(".html"))) {
    const item = parseDetailPage(path.join("works", file), "works");
    const cover = worksCovers.get(item.slug);
    if (cover?.src) {
      item.heroImage = cover.src;
      item.heroAlt = cover.alt || item.heroAlt;
    }
    works.push(item);
  }
  works.sort((a, b) => {
    const ia = worksListOrder.indexOf(a.slug);
    const ib = worksListOrder.indexOf(b.slug);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  works.forEach((item, index) => {
    item.order = index + 1;
    writeJson(`src/content/works/${item.slug}.json`, item);
  });

  const shop = [];
  for (const file of fs.readdirSync(path.join(ROOT, "shop")).filter((f) => f.endsWith(".html"))) {
    const item = parseDetailPage(path.join("shop", file), "shop");
    shop.push(item);
  }
  shop.forEach((item, index) => {
    item.order = index + 1;
    writeJson(`src/content/shop/${item.slug}.json`, item);
  });

  // Basic landing / list-page placeholders used by templates and Decap collections.
  writeJson("src/content/pages/news-index.json", {
    title: "News",
    bodyHtml: "",
  });

  console.log(
    `Seeded content: ${newsList.length} news items, ${works.length} works items, ${shop.length} shop items.`
  );
}

main();
