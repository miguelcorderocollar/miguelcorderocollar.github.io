#!/usr/bin/env node
/** Check a running local or deployed static build. Does not change the site. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const base = new URL(process.argv[2] || 'http://127.0.0.1:8001');
let checks = 0;
for (const route of ['/', '/people/', '/quotes/', '/trends/', '/projects/', '/brand/', '/shader/', '/blog/', '/blog/sample-post/', '/index.html', '/people/index.html']) {
  const res = await fetch(new URL(route, base));
  assert.equal(res.status, 200, route);
  assert.match(res.headers.get('content-type') || '', /text\/html/,route);
  const body = await res.text();
  assert.match(body, /<h1/, route);
  checks++;
}
for (const [route, type] of [
  ['/index.md', /text\/markdown/], ['/blog/sample-post/index.md', /text\/markdown/], ['/blog/sample-post/index.mdx', /text\/(?:plain|mdx)|application\/octet-stream/], ['/people/index.md', /text\/markdown/], ['/quotes/index.md', /text\/markdown/], ['/trends/index.md', /text\/markdown/], ['/documents/Miguel-Cordero-CV.md', /text\/markdown/], ['/blog/sample-post/index.md', /text\/markdown/],
  ['/people/people-data.json', /application\/json/], ['/quotes/quotes-data.json', /application\/json/], ['/trends/trends-data.json', /application\/json/],
  ['/rss.xml', /(?:text|application)\/xml/], ['/sitemap.xml', /(?:text|application)\/xml/], ['/robots.txt', /text\/plain/], ['/llms.txt', /text\/plain/],
]) {
  const res = await fetch(new URL(route,base));
  assert.equal(res.status,200,route);
  assert.match(res.headers.get('content-type') || '',type,route);
  const body = await res.text();
  assert.ok(body.length > 0,route);
  assert.doesNotMatch(body,/draft-fixture|future-fixture/,route);
  checks++;
}
for (const route of ['/blog/draft-fixture/', '/blog/draft-fixture/index.md', '/blog/future-fixture/', '/blog/future-fixture/index.md', '/a-route-that-does-not-exist/', '/src/content/blog/draft-fixture.md', '/scripts/build_cv.py', '/images/people/source/']) {
  const res = await fetch(new URL(route,base));
  assert.equal(res.status,404,route);
  if (route === '/a-route-that-does-not-exist/') assert.match(await res.text(), /This route returned null/);
  checks++;
}
for (const route of ['/documents/Miguel-Cordero-CV.pdf', '/documents/Tesla Robotaxi - Master Thesis.pdf', '/brand/assets/miguel-cordero-collar-brand.zip']) {
  const res = await fetch(new URL(route,base));
  assert.equal(res.status,200,route);
  const hash = buffer => createHash('sha256').update(buffer).digest('hex');
  assert.equal(hash(Buffer.from(await res.arrayBuffer())),hash(await readFile(new URL('../public'+route,import.meta.url))),route);
  checks++;
}
console.log(`Passed ${checks} HTTP checks: pages, legacy paths, MIME types, hidden routes, custom 404 and byte-identical downloads.`);
