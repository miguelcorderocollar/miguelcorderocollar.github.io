import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('adding/editing Markdown publishes through normal builds, stable slugs survive renames, and invalid metadata fails', {timeout:60000}, () => {
  const root = process.cwd();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcc-publishing-'));
  try {
    for (const name of ['src','brand','people','quotes','trends','projects','documents','docs']) fs.cpSync(path.join(root,name),path.join(temp,name),{recursive:true});
    for (const name of ['astro.config.mjs','tsconfig.json','package.json']) fs.copyFileSync(path.join(root,name),path.join(temp,name));
    for (const name of ['node_modules','public']) fs.symlinkSync(path.join(root,name),path.join(temp,name),'dir');
    const build = () => spawnSync(process.execPath, [path.join(root,'node_modules/astro/bin/astro.mjs'),'build'],{cwd:temp,encoding:'utf8',timeout:15000,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
    const read = file => fs.readFileSync(path.join(temp,'dist',file),'utf8');
    const file = path.join(temp,'src/content/blog/temporary-entry.md');
    const post = (title, body, extras='') => `---\ntitle: ${title}\ndescription: Synthetic build regression fixture.\npublished: 2026-01-01\nslug: stable-fixture\n${extras}\n---\n\n${body}\n`;
    fs.writeFileSync(file,post('Synthetic first title','Synthetic first body.'));
    let result = build();
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.match(read('blog/stable-fixture/index.html'), /Synthetic first body/);
    assert.match(read('blog/index.html'), /Synthetic first title/);
    assert.match(read('rss.xml'), /Synthetic first title/);
    assert.match(read('sitemap.xml'), /blog\/stable-fixture\//);
    const renamed = path.join(temp,'src/content/blog/renamed-entry.mdx');
    fs.renameSync(file,renamed);
    fs.writeFileSync(renamed,post('Synthetic revised title',"import ReadingLab from '../../components/ReadingLab.astro';\n\nSynthetic revised body.\n\n<ReadingLab size={20} />"));
    result = build();
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.match(read('blog/stable-fixture/index.html'), /Synthetic revised body/);
    assert.match(read('blog/stable-fixture/index.md'), /Synthetic revised body/);
    assert.match(read('blog/stable-fixture/index.mdx'), /ReadingLab/);
    assert.match(read('blog/stable-fixture/index.html'), /<reading-lab/);
    assert.doesNotMatch(read('rss.xml'), /Synthetic first title/);
    // An explicit `updated` date drives dateModified, sitemap lastmod and the feed; it cannot precede publication.
    fs.writeFileSync(renamed,post('Synthetic revised title','Synthetic revised body.','updated: 2026-02-01'));
    result = build();
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.match(read('sitemap.xml'), /blog\/stable-fixture\/<\/loc><lastmod>2026-02-01<\/lastmod>/);
    assert.match(read('blog/stable-fixture/index.html'), /"datePublished":"2026-01-01T00:00:00.000Z","dateModified":"2026-02-01T00:00:00.000Z"/);
    assert.match(read('blog/stable-fixture/index.html'), /article:modified_time" content="2026-02-01T00:00:00.000Z"/);
    assert.match(read('blog/stable-fixture/index.md'), /^updated: 2026-02-01T00:00:00.000Z$/m);
    fs.writeFileSync(renamed,post('Synthetic revised title','Synthetic revised body.','updated: 2025-12-31'));
    result = build();
    assert.notEqual(result.status,0,'`updated` earlier than `published` must reject the build.');
    assert.match(result.stdout+result.stderr,/updated/);
    fs.writeFileSync(renamed,post('Synthetic revised title','Synthetic revised body.','draft: true'));
    result = build();
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.ok(!fs.existsSync(path.join(temp,'dist/blog/stable-fixture')));
    for (const file of ['blog/index.html','rss.xml','sitemap.xml']) assert.doesNotMatch(read(file),/stable-fixture/);
    fs.writeFileSync(file,post('Duplicate fixture','Duplicate fixture.'));
    result = build();
    assert.notEqual(result.status,0,'Duplicate slug must reject the build, even when one entry is a draft.');
    assert.match(result.stdout+result.stderr,/Duplicate blog slug/);
    fs.rmSync(file);
    fs.writeFileSync(renamed,'---\ntitle: Missing required description and slug\npublished: not-a-date\n---\nInvalid fixture.\n');
    result=build();
    assert.notEqual(result.status,0,'Invalid metadata must reject the build.');
    assert.match(result.stdout+result.stderr,/schema|invalid|Invalid|description/);
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
  }
});

test('the blog appears only when an article is visible: samples are development/preview only', {timeout:90000}, () => {
  const root = process.cwd();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcc-visibility-'));
  try {
    for (const name of ['src','brand','people','quotes','trends','projects','documents','docs']) fs.cpSync(path.join(root,name),path.join(temp,name),{recursive:true});
    for (const name of ['astro.config.mjs','tsconfig.json','package.json']) fs.copyFileSync(path.join(root,name),path.join(temp,name));
    for (const name of ['node_modules','public']) fs.symlinkSync(path.join(root,name),path.join(temp,name),'dir');
    // Start from samples and fixtures only, so real published articles don't affect the "no real article" case.
    const blogDir = path.join(temp,'src/content/blog');
    const specimens = new Set(['sample-post.mdx','sample-plain-markdown.md','draft-fixture.md','future-fixture.md']);
    for (const file of fs.readdirSync(blogDir)) if (!specimens.has(file)) fs.rmSync(path.join(blogDir,file),{recursive:true});
    // The suite itself runs with BLOG_SAMPLES=1; each build here states its own environment.
    const build = environment => {
      const env = {...process.env,ASTRO_TELEMETRY_DISABLED:'1'};
      delete env.BLOG_SAMPLES; delete env.VERCEL_ENV;
      const result = spawnSync(process.execPath,[path.join(root,'node_modules/astro/bin/astro.mjs'),'build'],{cwd:temp,encoding:'utf8',timeout:30000,env:{...env,...environment}});
      assert.equal(result.status,0,result.stdout+result.stderr);
    };
    const read = file => fs.readFileSync(path.join(temp,'dist',file),'utf8');
    const exists = file => fs.existsSync(path.join(temp,'dist',file));

    // Production with only sample posts: the blog does not exist anywhere.
    build({VERCEL_ENV:'production'});
    for (const file of ['blog','rss.xml','blog/sample-post','blog/sample-plain-markdown']) assert.ok(!exists(file),`${file} must not be published in production without a real article`);
    for (const file of ['index.html','projects/index.html','quotes/index.html','people/index.html','trends/index.html','404.html']) assert.doesNotMatch(read(file),/href="\/blog\/"|rss\+xml|with-blog/,`${file} must not link the blog`);
    assert.doesNotMatch(read('sitemap.xml'),/\/blog\//);
    assert.doesNotMatch(read('llms.txt'),/blog|rss|\{\{/i);
    for (const file of ['index.md','documents/Miguel-Cordero-Profile.md']) assert.doesNotMatch(read(file),/## Blog|\/blog\//,`${file} must not mention the blog`);

    // Production with a real article: only that article is public, and the blog appears.
    fs.writeFileSync(path.join(temp,'src/content/blog/real-article.md'),'---\ntitle: A real article\ndescription: A real article that is meant for the public, written to exercise the production build.\npublished: 2026-01-01\ntags: [writing]\nslug: real-article\n---\n\nReal body.\n');
    build({VERCEL_ENV:'production'});
    assert.match(read('blog/index.html'),/A real article/);
    assert.doesNotMatch(read('blog/index.html'),/A small, useful tool|plain Markdown note/);
    assert.ok(exists('blog/real-article/index.html') && !exists('blog/sample-post'));
    assert.ok(exists('rss.xml'));
    assert.match(read('index.html'),/href="\/blog\/"[\s\S]*with-blog|with-blog[\s\S]*href="\/blog\/"/);
    assert.match(read('index.html'),/rel="alternate" type="application\/rss\+xml"/);
    assert.match(read('sitemap.xml'),/blog\/real-article\//);
    assert.doesNotMatch(read('sitemap.xml')+read('rss.xml')+read('llms.txt'),/sample-post|sample-plain-markdown/);
    assert.match(read('llms.txt'),/real-article/);
    assert.match(read('index.md'),/## Blog/);

    // Vercel preview and development deployments show the samples alongside real posts.
    for (const VERCEL_ENV of ['preview','development']) {
      build({VERCEL_ENV});
      assert.ok(exists('blog/sample-post/index.html') && exists('blog/real-article/index.html'),`${VERCEL_ENV} shows samples`);
    }
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
