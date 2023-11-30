
/**
 * Information about a chat topic. These are made automatically during the operation of Banta.
 */
export interface Topic {
    // CAUTION: This object is sent directly to the client in the REST API.
    id: string;
    createdAt: number;
    description?: string;
    url?: string;
    messageCount: number;
}