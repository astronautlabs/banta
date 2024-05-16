
const VALID_ORDERS = ['newest', 'oldest', 'likes'] as const;
export type CommentsOrder = (typeof VALID_ORDERS)[number];
export const CommentsOrder = { 
    NEWEST: 'newest',
    OLDEST: 'oldest',
    LIKES: 'likes',
    options: VALID_ORDERS
} as const;