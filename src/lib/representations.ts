import people from '../../people/people-data.json';
import quotes from '../../quotes/quotes-data.json';
import trends from '../../trends/trends-data.json';
import profileSource from '../../documents/Miguel-Cordero-Profile.md?raw';
import { isBlogLive } from './blog';
import cv from '../../documents/Miguel-Cordero-CV.md?raw';
import policy from '../../docs/agent-readiness.md?raw';
import shaderGuide from '../../docs/image-shader.md?raw';
import brandMd from '../../brand/index.md?raw';
import trendsGuide from '../../docs/google-trends-refresh.md?raw';
import projects from '../../projects/projects.json';
const base = 'https://miguelcorderocollar.com';
const blocks = (rows: string[]) => rows.join('\n').trimEnd() + '\n';
const peopleMd = blocks(['# People', '', 'Public figures whose work has shaped how Miguel Cordero Collar thinks and works. His family and friends come first; this is a collection of public influences, not an endorsement of everything they have said or done.', '', `Updated: ${people.updated}`, '', `Source data: [JSON](${base}/people/people-data.json)`, '', ...people.people.flatMap(p => [
  `## ${p.name}`, '', `**${p.role}** · ${p.categoryLabel}`, '', p.summary, '', p.bio || '', '',
  ...(p.links || []).map(l => `- [${l.label}](${l.url})`), '',
  p.photo?.sourceUrl ? `Portrait credit: ${p.photo.credit} · [${p.photo.license}](${p.photo.sourceUrl})` : '', '',
])]);
const quotesMd = blocks(['# Quotes', '', 'A notebook of lines Miguel Cordero Collar returns to. Follow source links for context and attribution.', '', `Updated: ${quotes.updated}`, '', `Source data: [JSON](${base}/quotes/quotes-data.json)`, '', ...quotes.quotes.flatMap(q => [
  `## ${q.author} · ${q.categoryLabel}`, '', '> ' + q.text.replaceAll('\n', '\n> '), '',
  ...(q.originalText ? ['Original wording:', '', '> ' + q.originalText.replaceAll('\n', '\n> '), ''] : []),
  `— ${q.author}, ${q.sourceUrl ? `[${q.source}](${q.sourceUrl})` : q.source}`, '',
])]);
const trendsMd = blocks(['# Trends', '', 'Personal interests alongside Google Trends search interest. Values are relative within each query, geography, property and time range; they are not search counts.', '', `Snapshot retrieved: ${trends.retrievedAt}`, `Geography: ${trends.defaultGeo} · Property: ${trends.defaultProperty}`, '', `Source data: [JSON](${base}/trends/trends-data.json)`, '', ...trends.signals.flatMap(s => [
  `## ${s.label}`, '', `**Category:** ${s.categoryLabel}`, `**Personal marker:** ${s.personalInterestLabel}`, `**Query:** ${s.query} · ${s.dateRange}`, '', `[Open this Google Trends query](${s.sourceUrl})`, '',
  s.aboutMarkdown || '', '', s.contextMarkdown || '', '',
  `Snapshot series (${s.series.interval}, starting ${s.series.start}, relative values 0–100): ${s.series.values.join(', ')}.`, '',
])]);
// The profile mirror always documents the blog, but the published representations only
// mention it once the blog is visible in this environment.
const blogLive = await isBlogLive();
const profile = blogLive ? profileSource : profileSource.replace(/\n## Blog\n[\s\S]*?(?=\n## |\s*$)/, '');
const homeMd = profile.replaceAll('https://miguelcorderocollar.github.io/', base + '/').replace(/\]\(\.\.\//g, `](${base}/`).replace(/[ \t]{2,}$/gm, '<br>') + '\n\n## Machine-readable collections\n\n' + ['People', 'Quotes', 'Trends'].map(n => `- [${n}](${base}/${n.toLowerCase()}/index.md)`).join('\n') + (blogLive ? `\n- [Blog](${base}/blog/)\n` : '\n');
export const representations = new Map<string, {body: string; type: string}>([
  ['index.md', {body: homeMd, type: 'text/markdown'}],
  ['brand/index.md', {body: brandMd, type: 'text/markdown'}],
  ['people/index.md', {body: peopleMd, type: 'text/markdown'}],
  ['quotes/index.md', {body: quotesMd, type: 'text/markdown'}],
  ['trends/index.md', {body: trendsMd, type: 'text/markdown'}],
  ['documents/Miguel-Cordero-CV.md', {body: cv, type: 'text/markdown'}],
  ['documents/Miguel-Cordero-Profile.md', {body: profile, type: 'text/markdown'}],
  ['docs/agent-readiness.md', {body: policy, type: 'text/markdown'}],
  ['docs/image-shader.md', {body: shaderGuide, type: 'text/markdown'}],
  ['docs/google-trends-refresh.md', {body: trendsGuide, type: 'text/markdown'}],
  ...Object.entries({'people/people-data.json': people, 'quotes/quotes-data.json': quotes, 'trends/trends-data.json': trends, 'projects/projects.json': projects}).map(([path, data]) => [path, {body: JSON.stringify(data, null, 2) + '\n', type: 'application/json'}] as [string, {body: string; type: string}]),
]);
