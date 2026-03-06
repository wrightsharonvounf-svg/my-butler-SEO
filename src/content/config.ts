import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',

  schema: z.object({
    title: z.string(),

    description: z.string(),

    pubDate: z.date(),

    updatedDate: z.date().optional(),

    author: z.string().optional(),

    tags: z.array(z.string()).optional(),

    cluster: z.enum([
      "taxes",
      "profit",
      "districts",
      "investments"
    ]),

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