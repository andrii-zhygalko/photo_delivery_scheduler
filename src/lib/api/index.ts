// Export everything from with-auth
export { withAuth, ApiError, handleApiRequest } from './with-auth';

// Export validation schemas
export {
  createItemSchema,
  updateItemSchema,
  itemsQuerySchema,
  type CreateItemInput,
  type UpdateItemInput,
  type ItemsQueryInput,
} from './schemas';
