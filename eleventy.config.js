/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
module.exports = function (eleventyConfig) {
  const MarkdownIt = require("markdown-it");
  const markdownIt = MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
  });

  eleventyConfig.addFilter("markdownToHtml", (value) => {
    if (typeof value !== "string" || !value.trim()) return "";
    return markdownIt.render(value);
  });

  eleventyConfig.addPassthroughCopy({ assets: "assets" });
  eleventyConfig.addPassthroughCopy({ content: "content" });
  eleventyConfig.addPassthroughCopy({ admin: "admin" });

  eleventyConfig.addWatchTarget("./content/");
  eleventyConfig.addWatchTarget("./admin/");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
