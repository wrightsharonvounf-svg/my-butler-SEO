import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),   // ← БЕЗ transform
    author: z.string(),
    heroImage: z.string().optional(),
  }),
});

export const collections = {
  posts: postsCollection,
};
