import { test, expect } from '@playwright/test';

// Collection pages must look identical to the original static site no matter which order
// the shared and page stylesheets arrive in (stale cache, reordered <link>, dev server reloads).
const collections = ['/quotes/', '/people/', '/trends/'];

async function measure(page) {
  return page.evaluate(() => {
    const box = selector => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.width)]; };
    return {
      body: box('body'), header: box('.site-header'), heading: box('.collection-heading'), main: box('main'),
      switcher: box('.mode-switcher'), search: getComputedStyle(document.querySelector('.quote-search > span, .people-search > span') || document.body).textTransform,
      bodyPaddingTop: getComputedStyle(document.body).paddingTop,
    };
  });
}

for (const width of [390, 845, 1440]) {
  for (const path of collections) {
    test(`${path} keeps the shared site layout at ${width}px in any stylesheet order`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const normal = await measure(page);
      expect(normal.bodyPaddingTop, 'No extra space above the header').toBe('0px');
      expect(normal.search, 'Search label must not be uppercase').not.toBe('uppercase');
      expect(normal.main[1], 'Main column matches the header width').toBe(normal.header[1]);
      // Moving a <link> reloads that stylesheet asynchronously, so wait until both are applied again.
      await page.evaluate(() => new Promise(resolve => {
        const home = document.querySelector('link[href="/homepage.css"]');
        const links = ['/site.css', '/collections.css'].map(href => document.querySelector(`link[href="${href}"]`));
        let pending = links.length;
        for (const link of links) { link.addEventListener('load', () => { if (--pending === 0) resolve(); }, { once: true }); home.after(link); }
      }));
      expect(await measure(page)).toEqual(normal);
    });
  }
}
