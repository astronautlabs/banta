const VALID_FILTERS = [ 'all', 'mine', 'threads', 'my-likes' ];
export type FilterMode = (typeof VALID_FILTERS)[number];

export const FilterMode = {
    ALL: 'all',
    MINE: 'mine',
    THREADS: 'threads',
    MY_LIKES: 'my-likes',
    options: VALID_FILTERS
} as const;