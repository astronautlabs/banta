import { ChatMessage } from "@banta/common";

export interface MessageMenuItem {
    icon: string;
    label: string;
    action: (message: ChatMessage) => void;
}