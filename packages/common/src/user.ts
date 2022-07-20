export interface User {
    id? : string;
    uid? : string;
    displayName : string;
    username : string;
    avatarUrl? : string;
    token?: string;

    ipAddress?: string;
    userAgent?: string;

    /**
     * A tag shown near the user's name (ie "Staff" etc)
     */
    tag?: string;
}
