import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // Keep file IDs independent of frontmatter slugs. The default loader uses
  // data.slug as its ID and can overwrite a duplicate before validation.
  loader: glob({
    base: './src/content/blog',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry,
  }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    published: z.coerce.date(),
    tags: z.array(z.string().trim().min(1)).default([]),
    draft: z.boolean().default(false),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a stable lowercase, hyphenated slug.'),
  }),
});

export const collections = { blog };
