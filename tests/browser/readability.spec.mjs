import { test, expect } from '@playwright/test';

// Larger type applies to the blog only; other pages keep their original sizes.
const pages = [
  {path:'/blog/',rules:[['.blog-row-copy > p',16],['.blog-row-date',14],['.blog-feed',14]]},
  {path:'/blog/sample-post/',rules:[['.article-prose',17],['.article-meta',14],['.article-aside',14]]},
];

for (const width of [320,390,768,1440]) {
  for (const entry of pages) {
    test(`${entry.path} has readable type and reflows at ${width}px`, async ({page}) => {
      await page.setViewportSize({width,height:900});
      await page.goto(entry.path);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      expect(overflow,'The page must not require horizontal scrolling. Tables and code may scroll within their own boxes.').toBe(false);
      for (const [selector,minimum] of entry.rules) {
        const values = await page.locator(selector).evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => parseFloat(getComputedStyle(el).fontSize)));
        expect(values.length,`${selector} must match visible text`).toBeGreaterThan(0);
        for (const value of values) expect(value,`${selector} must be at least ${minimum} CSS px at the default root size`).toBeGreaterThanOrEqual(minimum);
      }
    });
  }
}

test('article text follows a doubled default font size and keeps its content',async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/blog/sample-post/');
  const before = await page.locator('.article-prose').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await page.addStyleTag({content:'html { font-size: 200%; }'});
  const after = await page.locator('.article-prose').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(after).toBeCloseTo(before * 2);
  await expect(page.getByRole('heading',{name:'Link to the next step',exact:true})).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('MDX reading widget accepts keyboard input and resets', async ({page}) => {
  await page.goto('/blog/sample-post/');
  const widget=page.locator('reading-lab');
  await expect(widget).toHaveAttribute('data-ready','true');
  const size=widget.getByRole('slider',{name:/Text size/});
  await size.focus(); await size.press('ArrowRight');
  await expect(widget.locator('[data-size-output]')).toHaveText('19 px');
  const pace=widget.getByRole('slider',{name:/Words per minute/});
  await pace.focus(); await pace.press('ArrowRight');
  await expect(widget.locator('.reading-lab__result')).toContainText('230 words per minute');
  await widget.getByRole('button',{name:'Reset preview',exact:true}).click();
  await expect(widget.locator('[data-size-output]')).toHaveText('18 px');
  await expect(widget.locator('.reading-lab__result')).toContainText('220 words per minute');
});

test('MDX article and component fallback remain readable without JavaScript', async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto('/blog/sample-post/');
  await expect(page.getByRole('heading',{name:'A reusable interactive component',exact:true})).toBeVisible();
  await expect(page.locator('.reading-lab__preview')).toContainText('Good tools leave room');
  await page.getByText('What is happening here?',{exact:true}).click();
  await expect(page.getByText(/This is a native HTML details element/)).toBeVisible();
  await context.close();
});
