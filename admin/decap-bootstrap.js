/**
 * Decap CMS bootstrap: manual init + preSave slug from Title.
 * @see https://decapcms.org/docs/registering-events/
 * @see https://decapcms.org/docs/manual-initialization/
 */
(function () {
  var CMS = window.CMS;
  var initCMS = window.initCMS;
  if (!CMS || typeof initCMS !== "function") {
    console.error(
      "decap-bootstrap: CMS / initCMS not found. Check that decap-cms.js loaded before this file."
    );
    return;
  }

  /** Title is expected in Latin; non-ASCII letters are stripped by slugify. */
  function slugifyAscii(str) {
    return String(str)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  /** preSave receives (payload); payload.entry is an Immutable Map when using decap-cms 3.x */
  function collectionNameFromPayload(payload) {
    if (!payload || !payload.entry) return null;
    var entry = payload.entry;
    var raw = typeof entry.get === "function" ? entry.get("collection") : entry.collection;
    if (typeof raw === "string") return raw;
    if (raw && typeof raw.get === "function") return raw.get("name") || null;
    return null;
  }

  var SLUG_COLLECTIONS = { news: true, works: true, shop: true };

  CMS.registerEventListener({
    name: "preSave",
    handler: function (payload) {
      try {
        var coll = collectionNameFromPayload(payload);
        if (!coll || !SLUG_COLLECTIONS[coll]) return;

        var entry = payload.entry;
        if (!entry || typeof entry.get !== "function") return;

        var data = entry.get("data");
        if (!data || typeof data.get !== "function") return;

        var rawTitle = data.get("title");
        var title =
          rawTitle == null
            ? ""
            : typeof rawTitle === "string"
              ? rawTitle
              : String(rawTitle);

        var rawSlug = data.get("slug");
        var slug =
          rawSlug == null ? "" : String(rawSlug).trim();

        if (slug) return;

        var generated = slugifyAscii(title.trim());
        if (!generated) return;

        return data.set("slug", generated);
      } catch (err) {
        console.error("decap-bootstrap preSave:", err);
        return;
      }
    },
  });

  try {
    initCMS();
  } catch (err) {
    console.error("decap-bootstrap initCMS:", err);
  }
})();
