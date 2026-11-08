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
