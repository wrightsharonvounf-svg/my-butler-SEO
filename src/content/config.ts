import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',

  schema: z.object({

    title: z.string(),

    description: z.string(),

    pubDate: z.coerce.date(),

    updatedDate: z.coerce.date().optional(),

    author: z.string().optional(),

    tags: z.array(z.string()).optional(),

    cluster: z.enum([
      "taxes",
      "profit",
      "districts",
      "investments"
    ]).optional(),

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