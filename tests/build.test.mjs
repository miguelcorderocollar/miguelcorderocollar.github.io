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
  for (const pattern of [/<h1/, /id="start-with-the-task"/, /<pre/, /<table/, /og-default\.jpg/, /application\/ld\+json/, /property="og:type" content="article"/, /rel="canonical" href="https:\/\/miguelcorderocollar.com\/blog\/sample-post\/"/]) assert.match(html, pattern);
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
  for (const route of ['', 'projects/','people/','quotes/','trends/','brand/','blog/']) assert.ok(xml.includes(`<loc>https://miguelcorderocollar.com/${route}</loc>`),route);
  assert.doesNotMatch(xml, /github.io|404|\/shader\//);
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


test('MDX specimen renders components, native HTML, SVG, iframe and footnotes without React', () => {
  const html=read('blog/sample-post/index.html');
  for (const pattern of [/<reading-lab/, /<details>/, /<figure/, /<iframe/, /<svg/, /footnotes/, /type="range"/, /data-copy-md="\/blog\/sample-post\/index\.md"/]) assert.match(html,pattern);
  assert.match(read('blog/sample-post/index.mdx'), /import ReadingLab/);
  // Astro also emits shared runtimes (such as link prefetching) as /_astro assets, so look at every script.
  const assets = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match=>match[1]).filter(src=>src.startsWith('/_astro/')).map(src=>read(src.slice(1)));
  const inline = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
  const behavior = [...assets, inline].join('\n');
  assert.match(behavior, /reading-lab/, 'The MDX component must include its compiled browser behavior, inline or as an asset.');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.dependencies.react,undefined);
});

test('shared collection/site styles load after every page stylesheet', () => {
  const wrong = [];
  for (const page of pages.filter(page => page !== 'shader/index.html' && page !== '404.html')) {
    const hrefs = [...read(page).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]).filter(href => !href.startsWith('/_astro/'));
    const shared = hrefs.filter(href => ['/collections.css', '/site.css'].includes(href));
    if (shared.join() !== '/collections.css,/site.css' || hrefs.slice(-2).join() !== shared.join()) wrong.push(`${page}: ${hrefs.join(' ')}`);
  }
  assert.deepEqual(wrong, []);
});

// --- Search and agent discovery -------------------------------------------------------------
const blogPages = () => ['blog/index.html', ...walk(path.join(out, 'blog')).map(file => path.relative(out, file)).filter(file => /^blog\/[^/]+\/index\.html$/.test(file))];
const articles = () => blogPages().filter(file => file !== 'blog/index.html');
const jsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => { const data = JSON.parse(match[1]); return data['@graph'] ?? [data]; });
const meta = (html, name) => html.match(new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`))?.[1];
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

test('collection datasets include Google-required descriptions, typed creators and the existing license', () => {
  for (const section of ['people', 'quotes', 'trends']) {
    const page = `${section}/index.html`;
    const collection = jsonLd(read(page)).find(node => node['@type'] === 'CollectionPage');
    const dataset = collection.mainEntity;
    assert.equal(dataset['@type'], 'Dataset', page);
    assert.ok(dataset.name.length > 0, page);
    assert.equal(dataset.description, collection.description, page);
    assert.ok(dataset.description.length >= 50 && dataset.description.length <= 5000, `${page} dataset description length`);
    assert.equal(dataset.creator['@type'], 'Person', page);
    assert.equal(dataset.creator.name, 'Miguel Cordero Collar', page);
    assert.equal(dataset.creator['@id'], 'https://miguelcorderocollar.com/#miguel-cordero-collar', page);
    assert.equal(dataset.creator.url, 'https://miguelcorderocollar.com/', page);
    assert.equal(dataset.license, 'https://opensource.org/license/mit', page);
    assert.ok(fs.existsSync(path.join(out, new URL(dataset.url).pathname)), `${page} dataset download exists`);
  }
});

test('every article has consistent canonical, social, and valid BlogPosting + breadcrumb structured data', () => {
  assert.ok(articles().length >= 1);
  for (const page of articles()) {
    const html = read(page);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
    assert.equal(canonical, `https://miguelcorderocollar.com/${page.replace('index.html', '')}`, page);
    assert.equal(meta(html, 'og:url'), canonical, page);
    assert.equal(meta(html, 'og:type'), 'article', page);
    assert.equal(html.match(/<h1[ >]/g).length, 1, `${page} needs exactly one h1`);
    assert.ok((meta(html, 'description') ?? '').length >= 50 && meta(html, 'description').length <= 200, `${page} description length`);
    const nodes = jsonLd(html);
    const post = nodes.find(node => node['@type'] === 'BlogPosting');
    const crumbs = nodes.find(node => node['@type'] === 'BreadcrumbList');
    assert.ok(post && crumbs, page);
    assert.equal(post.headline, html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1].replace(/<[^>]+>/g, '').trim(), `${page} headline must match the visible h1`);
    assert.equal(post.url, canonical);
    assert.equal(post.mainEntityOfPage['@id'], canonical);
    assert.match(post.datePublished, iso);
    assert.match(post.dateModified, iso);
    assert.ok(post.dateModified >= post.datePublished, `${page} dateModified must not precede datePublished`);
    assert.equal(meta(html, 'article:published_time'), post.datePublished);
    assert.equal(meta(html, 'article:modified_time'), post.dateModified);
    assert.equal(post.author['@type'], 'Person');
    assert.equal(post.author.name, 'Miguel Cordero Collar');
    assert.equal(post.inLanguage, 'en');
    assert.ok(post.wordCount > 0);
    const [image] = post.image;
    assert.ok(image.startsWith('https://miguelcorderocollar.com/'), 'image must be absolute');
    assert.ok(fs.existsSync(path.join(out, new URL(image).pathname)), `${page} image must exist in the build`);
    assert.equal(meta(html, 'og:image'), image);
    assert.deepEqual(crumbs.itemListElement.map(item => item.position), [1, 2, 3]);
    assert.equal(crumbs.itemListElement.at(-1).item, canonical);
    for (const item of crumbs.itemListElement) assert.ok(item.item.startsWith('https://miguelcorderocollar.com/'));
  }
});

test('blog index describes every article in structured data and advertises the feed', () => {
  const html = read('blog/index.html');
  const blog = jsonLd(html).find(node => node['@type'] === 'Blog');
  assert.ok(blog);
  assert.deepEqual(
    blog.blogPost.map(post => post.url).sort(),
    articles().map(page => `https://miguelcorderocollar.com/${page.replace('index.html', '')}`).sort(),
  );
  assert.match(html, /<link rel="alternate" type="application\/rss\+xml"[^>]*href="\/rss\.xml"/);
});

test('sitemap lists each article with an accurate lastmod and recorded dates elsewhere', () => {
  const entries = [...read('sitemap.xml').matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map(match => [match[1], match[2]]);
  const byUrl = new Map(entries);
  assert.equal(byUrl.size, entries.length, 'no duplicate URLs');
  for (const page of articles()) {
    const url = `https://miguelcorderocollar.com/${page.replace('index.html', '')}`;
    const lastmod = byUrl.get(url);
    assert.match(lastmod ?? '', /^\d{4}-\d{2}-\d{2}$/, url);
    const modified = jsonLd(read(page)).find(node => node['@type'] === 'BlogPosting').dateModified.slice(0, 10);
    assert.equal(lastmod, modified, `${url} sitemap lastmod must equal its dateModified`);
  }
  assert.match(byUrl.get('https://miguelcorderocollar.com/blog/') ?? '', /^\d{4}-\d{2}-\d{2}$/);
  // Pages outside /blog/ take their date from the source data that records it.
  const recorded = {
    '/': JSON.parse(fs.readFileSync('src/data/profile-schema.json', 'utf8'))[0].dateModified.slice(0, 10),
    '/people/': JSON.parse(fs.readFileSync('people/people-data.json', 'utf8')).updated,
    '/quotes/': JSON.parse(fs.readFileSync('quotes/quotes-data.json', 'utf8')).updated,
    '/trends/': JSON.parse(fs.readFileSync('trends/trends-data.json', 'utf8')).retrievedAt,
    '/projects/': JSON.parse(fs.readFileSync('projects/projects.json', 'utf8')).reviewedOn,
    '/brand/': JSON.parse(fs.readFileSync('brand/settings.json', 'utf8')).approvedOn,
  };
  for (const [path, expected] of Object.entries(recorded)) {
    assert.equal(byUrl.get(`https://miguelcorderocollar.com${path}`), expected, `${path} lastmod must come from its recorded date`);
  }
});

test('RSS feed is self-describing and stable for readers', () => {
  const xml = read('rss.xml');
  assert.match(xml, /<atom:link href="https:\/\/miguelcorderocollar\.com\/rss\.xml" rel="self" type="application\/rss\+xml"\s*\/>/);
  assert.match(xml, /<language>en<\/language>/);
  assert.match(xml, /<lastBuildDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} 00:00:00 GMT<\/lastBuildDate>/);
  const items = xml.match(/<item>.*?<\/item>/gs);
  assert.equal(items.length, articles().length);
  for (const item of items) {
    assert.match(item, /<guid isPermaLink="true">https:\/\/miguelcorderocollar\.com\/blog\/[a-z0-9-]+\/<\/guid>/);
    assert.match(item, /<pubDate>/);
    assert.match(item, /<dc:creator>Miguel Cordero Collar<\/dc:creator>/);
  }
});

test('llms.txt lists every published article with its raw source and leaves no template placeholder', () => {
  const txt = read('llms.txt');
  assert.doesNotMatch(txt, /\{\{/);
  assert.match(txt, /^# Miguel Cordero Collar/m);
  for (const page of articles()) {
    const slug = page.split('/')[1];
    assert.match(txt, new RegExp(`\\]\\(https://miguelcorderocollar\\.com/blog/${slug}/\\): .+\\[Markdown\\]\\(https://miguelcorderocollar\\.com/blog/${slug}/index\\.md\\)`), slug);
    assert.ok(fs.existsSync(path.join(out, 'blog', slug, 'index.md')), `${slug} needs a text/markdown source`);
    assert.match(read(page), new RegExp(`<link rel="alternate" type="text/markdown" href="https://miguelcorderocollar\\.com/blog/${slug}/index\\.md"`));
  }
});
