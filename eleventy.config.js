export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'site/assets': 'assets' });
  eleventyConfig.addFilter('fixed', (n, d = 1) => (n == null ? '–' : Number(n).toFixed(d)));
  eleventyConfig.addFilter('signed', (n, d = 1) => (n == null ? '–' : (n > 0 ? '+' : '') + Number(n).toFixed(d)));
  eleventyConfig.addFilter('ord', (n) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  });
  eleventyConfig.addFilter('dateOnly', (iso) => (iso ? String(iso).slice(0, 10) : ''));

  return {
    dir: { input: 'site', output: '_site', includes: '_includes', data: '_data' },
    // GitHub Pages project sites live under /<repo>/. The workflow sets PATH_PREFIX.
    pathPrefix: process.env.PATH_PREFIX || '/',
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
