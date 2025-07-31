export interface ServerInfo {
    service: string;
    serverId: string;
    originId: string;
    connections: number;
    cache: {
        topicCount: number;
        messageCount: number;
        topics: Record<string, number>;
    }
}