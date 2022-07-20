export interface ChatPermissions {
    /**
     * Whether posting is allowed in this context.
     */
    canPost: boolean;

    /**
     * Whether editing messages is allowed in this context.
     */
    canEdit: boolean;

    /**
     * Whether liking messages is allowed in this context.
     */
    canLike: boolean;

    /**
     * Whether deleting messages is allowed in this context.
     */
    canDelete: boolean;
}