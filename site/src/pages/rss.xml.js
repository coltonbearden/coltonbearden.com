import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { assertUniqueEditions, byEditionDesc } from '../utils/posts';

export async function GET(context) {
  const posts = byEditionDesc(assertUniqueEditions(await getCollection('posts')));
  return rss({
    title: 'Notes — Colton Bearden',
    description: 'Notes and write-ups by Colton Bearden.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
