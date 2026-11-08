import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const out = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(out, file), 'utf8');
const pages = ['index.html', 'people/index.html', 'quotes/index.html', 'trends/index.html', 'projects/index.html', 'brand/index.html', 'shader/index.html', 'blog/index.html', 'blog/sample-post/index.html', '404.html'];
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }

test('all existing pages are Astro-built HTML and local links/assets resolve', () => {
  const broken = [];
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<!doctype html>/i, page);
    const url = new URL(page.replace(/index.html$/, ''), 'https://miguelcorderocollar.com/');
    for (const match of html.matchAll(/\b(?:href|src|data-markdown-source)="([^"]+)"/g)) {
      const target = new URL(match[1].replaceAll('&amp;', '&'), url);
      if (target.origin !== url.origin || target.protocol !== 'https:') continue;
      const local = path.join(out, decodeURIComponent(target.pathname));
      const exists = fs.existsSync(local) && fs.statSync(local).isFile() || fs.existsSync(path.join(local, 'index.html'));
      if (!exists) broken.push(`${page}: broken local asset/link ${match[1]}`);
    }
  }
  assert.deepEqual(broken, []);
});
test('content collections are readable in raw HTML before JavaScript runs', () => {
  for (const [section, key, css] of [['people','people','person-card'],['quotes','quotes','quote-card'],['trends','signals','trend-card']]) {
    const data = JSON.parse(fs.readFileSync(`${section}/${section}-data.json`, 'utf8'));
    const entries = section === 'trends' ? data[key].filter(s => s.personalInterestDate && s.personalInterestLabel) : data[key];
    assert.equal([...read(`${section}/index.html`).matchAll(new RegExp(`class="${css}"`, 'g'))].length, entries.length, section);
    assert.doesNotMatch(read(`${section}/index.html`), /class="loading-state"/);
  }
});
test('Markdown/JSON representations have exact file paths and stay aligned with sources', () => {
  for (const file of ['index.md', 'people/index.md', 'quotes/index.md', 'trends/index.md','documents/Miguel-Cordero-CV.md','documents/Miguel-Cordero-Profile.md']) assert.ok(fs.statSync(path.join(out,file)).isFile(), file);
  assert.equal(read('documents/Miguel-Cordero-CV.md'), fs.readFileSync('documents/Miguel-Cordero-CV.md','utf8'));
  for (const section of ['people','quotes','trends','projects']) {
    const name = section === 'projects' ? 'projects.json' : `${section}-data.json`;
    assert.deepEqual(JSON.parse(read(`${section}/${name}`)), JSON.parse(fs.readFileSync(`${section}/${name}`,'utf8')));
  }
});
test('published Markdown becomes an article with headings, code, image, table and metadata', () => {
  const html = read('blog/sample-post/index.html');
  for (const pattern of [/<h1/, /id="start-with-the-task"/, /<pre/, /<table/, /mountains-after-hours.png/, /application\/ld\+json/, /property="og:type" content="article"/, /rel="canonical" href="https:\/\/miguelcorderocollar.com\/blog\/sample-post\/"/]) assert.match(html, pattern);
  assert.match(read('blog/sample-post/index.md'), /slug: sample-post/);
  assert.match(read('blog/index.html'), /href="\/blog\/sample-post\/"/);
  assert.match(read('rss.xml'), /https:\/\/miguelcorderocollar.com\/blog\/sample-post\//);
  assert.match(read('sitemap.xml'), /https:\/\/miguelcorderocollar.com\/blog\/sample-post\//);
});
test('drafts, future articles, source code and private build inputs never enter output', () => {
  const files = walk(out);
  for (const file of files) {
    assert.doesNotMatch(file.slice(out.length), /\/source\/|\/cropped\/|\/normalized\/|\/scripts\/|\/scratch\/|\/node_modules\/|\.astro$|\.ts$/);
    if (/\.(html|md|xml|json|txt)$/.test(file)) assert.doesNotMatch(fs.readFileSync(file,'utf8'), /draft-fixture|future-fixture|Draft fixture: unpublished blog entry|Future fixture: scheduled entry/);
  }
});
test('sitemap has canonical landing pages and excludes 404', () => {
  const xml = read('sitemap.xml');
  for (const route of ['', 'projects/','people/','quotes/','trends/','brand/','shader/','blog/']) assert.ok(xml.includes(`<loc>https://miguelcorderocollar.com/${route}</loc>`),route);
  assert.doesNotMatch(xml, /github.io|404/);
});
test('all local stylesheet dependencies and module imports exist', () => {
  for (const file of walk(out).filter(p => /\.(css|js)$/.test(p))) {
    const content = fs.readFileSync(file, 'utf8');
    const refs = file.endsWith('.css') ? [...content.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)] : [...content.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)];
    for (const [, ref] of refs) {
      if (/^(https?:|data:|#)/.test(ref) || !/^[./]/.test(ref)) continue;
      const base = new URL('file://' + file);
      const target = ref.startsWith('/') ? path.join(out, ref) : decodeURIComponent(new URL(ref,base).pathname);
      assert.ok(fs.existsSync(target.split('?')[0]), `${path.relative(out,file)}: ${ref}`);
    }
  }
});
