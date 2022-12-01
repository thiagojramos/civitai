import { z } from 'zod';
import { getAllQuerySchema } from '~/server/schema/base.schema';

export const tagSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name cannot be empty.'),
  color: z.string().nullish(),
});

export const getTagsInput = getAllQuerySchema
  .extend({
    withModels: z.preprocess((val) => {
      return val === 'true' || val === true;
    }, z.boolean().default(false)),
  })
  .partial();
export type GetTagsInput = z.infer<typeof getTagsInput>;
