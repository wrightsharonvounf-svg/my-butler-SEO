import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    tags: z.array(z.string()).optional(),

    // Для FAQ schema
    faq: z.array(
      z.object({
        question: z.string(),
        answer: z.string()
      })
    ).optional()
  })
});

export const collections = {
  posts
};