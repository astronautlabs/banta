export interface UrlCard {
    url: string;
    title: string;
    description: string;
    image?: string;

    /**
     * A URL that can be used in an iframe to play the content in an embed.
     */
    player?: string;
    playerWidth?: number;
    playerHeight?: number;
    retrievedAt: number;
}