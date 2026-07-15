import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { byEditionDesc } from '../utils/chronicle';

export async function GET(context) {
  const posts = byEditionDesc(await getCollection('chronicle'));
  return rss({
    title: 'The FirstCast Chronicle',
    description: 'Build-in-public log of the severed floor at coltonbearden.com.',
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
