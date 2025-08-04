export interface ChatPermissions {
    /**
     * Whether posting is allowed in this context.
     */
    canPost: boolean;
    canPostErrorMessage?: string;

    /**
     * Whether editing messages is allowed in this context.
     */
    canEdit: boolean;
    canEditErrorMessage?: string;

    /**
     * Whether liking messages is allowed in this context.
     */
    canLike: boolean;
    canLikeErrorMessage?: string;

    /**
     * Whether deleting messages is allowed in this context.
     */
    canDelete: boolean;
    canDeleteErrorMessage?: string;

    /**
     * Whether pinning/unpinning messages is allowed in this context.
     */
    canPin: boolean;
    canPinErrorMessage?: string;
}