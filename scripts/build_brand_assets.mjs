#!/usr/bin/env node
/** Render the approved assets from brand/settings.json, then rebuild the ZIP. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--sources') {
  console.error('Usage: node scripts/build_brand_assets.mjs --sources /private/folder\nFolder must contain headshot.png and mountains.jpg. Requires Playwright and Chromium.\nOptional: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs, CHROMIUM_PATH=/path/to/chromium');
  process.exit(1);
}
const sources = path.resolve(args[1]);
const selection = JSON.parse(await fs.readFile(path.join(root, 'brand/settings.json'), 'utf8'));
const files = new Map([
  ['/__sources/headshot.png', path.join(sources, 'headshot.png')],
  ['/__sources/mountains.jpg', path.join(sources, 'mountains.jpg')],
  ['/__sources/website-banner.png', path.join(root, 'images/bg/mountains-after-hours.png')],
  ['/scripts/brand-renderer.js', path.join(root, 'scripts/brand-renderer.js')],
  ...['halftone.js', 'image-rendering.js', 'mark.svg'].map(name => [
    `/assets/personal-style/${name}`, path.join(root, 'assets/personal-style', name),
  ]),
]);
const expected = {
  'headshot.png': selection.portrait.source.sha256,
  'mountains.jpg': selection.selectedBanner.adaptationSource.sha256,
  'website-banner.png': selection.selectedBanner.source.sha256,
};
for (const [name, hash] of Object.entries(expected)) {
  const bytes = await fs.readFile(files.get('/__sources/' + name));
  if (createHash('sha256').update(bytes).digest('hex') !== hash) {
    throw new Error(`Source hash differs for ${name}. Review the new source and update brand/settings.json before rebuilding.`);
  }
}
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
// Serve only the files needed for this build. Private photos never enter the checkout.
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'}).end('<!doctype html><title>Brand asset build</title>');
    return;
  }
  const file = files.get(url.pathname);
  if (!file) { res.writeHead(404).end(); return; }
  try {
    const bytes = await fs.readFile(file);
    const type = {'.js':'text/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml'}[path.extname(file)];
    res.writeHead(200, {'Content-Type':type, 'Cache-Control':'no-store'}).end(bytes);
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({headless:true,
    ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),
    args:['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async config => {
    window.renderer = await import('/scripts/brand-renderer.js');
    await window.renderer.initialize(config);
  }, selection);
  const rendered = new Map();
  for (const [name, method] of [['portrait.png','renderPortrait'], ['logo.png','renderLogo']]) {
    const png = await page.evaluate(async method => (await window.renderer[method]()).toDataURL('image/png').split(',')[1], method);
    rendered.set(name, Buffer.from(png, 'base64'));
  }
  for (const format of selection.selectedBanner.formats) {
    for (const variant of selection.selectedBanner.variants) {
      const png = await page.evaluate(({id, variant}) => window.renderer.renderBanner(id, variant).toDataURL('image/png').split(',')[1], {id:format.id, variant:variant.id});
      const name = `banner-${format.id}${variant.id === 'current' ? '' : '-' + variant.id}.png`;
      rendered.set(name, Buffer.from(png, 'base64'));
    }
  }
  rendered.set('logo.svg', await fs.readFile(path.join(root, 'assets/personal-style/mark.svg')));
  const output = path.join(root, 'brand/assets');
  await fs.mkdir(output, {recursive:true});
  // Finish rendering everything before replacing the public exports.
  for (const [name, bytes] of rendered) await fs.writeFile(path.join(output, name), bytes);
  console.log(`Rendered ${rendered.size} assets from brand/settings.json.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
execFileSync(process.env.PYTHON || 'python3', [path.join(root, 'scripts/package_brand_assets.py')], {cwd:root, stdio:'inherit'});
