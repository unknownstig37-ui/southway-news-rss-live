import { mkdir, writeFile } from 'node:fs/promises';

const source = 'https://southwaycrane.com/news/';
const response = await fetch(source, { headers: { 'User-Agent': 'SouthwayNewsRSS/1.0' } });
if (!response.ok) throw new Error(`News page returned ${response.status}`);
const html = await response.text();
const decode = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#039;|&apos;/gi, "'").replace(/\s+/g, ' ').trim();
const capture = (text, expression) => text.match(expression)?.[1] ?? '';
const escapeXml = text => text.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
const posts = [...html.matchAll(/<div id="post-[^"]+"[\s\S]*?(?=<div id="post-|<div class="pagination|<footer|$)/g)].map(match => {
  const block = match[0];
  const heading = block.match(/<h[1-3][^>]*class="[^"]*(?:dz-title|entry-title)[^"]*"[^>]*>[\s\S]*?<\/h[1-3]>/i)?.[0] ?? '';
  const url = capture(heading, /<a[^>]+href="([^"]+)"/i);
  const title = decode(capture(heading, /<a[^>]*>([\s\S]*?)<\/a>/i));
  const description = decode(capture(block, /<div[^>]+class="[^"]*(?:dz-post-text|entry-summary)[^"]*"[^>]*>([\s\S]*?)<\/div>/i));
  const dateText = decode(capture(block, /<li[^>]+class="[^"]*post-date[^"]*"[^>]*>([\s\S]*?)<\/li>/i));
  return url && title ? { url, title, description, date: new Date(dateText).toUTCString() } : null;
}).filter(Boolean);
if (!posts.length) throw new Error('No posts found; the news-page markup may have changed.');
const items = posts.map(post => `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(post.url)}</link><guid isPermaLink="true">${escapeXml(post.url)}</guid><description>${escapeXml(post.description)}</description><pubDate>${post.date}</pubDate></item>`).join('');
const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Southway Crane &amp; Rigging — News</title><link>${source}</link><description>Recent news from Southway Crane &amp; Rigging.</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
await mkdir('public', { recursive: true });
await writeFile('public/rss.xml', xml);
await writeFile('public/index.html', '<a href="rss.xml">Southway News RSS</a>');
console.log(`Wrote ${posts.length} RSS items.`);
