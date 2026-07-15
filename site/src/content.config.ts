import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const chronicle = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/chronicle' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    edition: z.number().int().positive(),
  }),
});

export const collections = { chronicle };
