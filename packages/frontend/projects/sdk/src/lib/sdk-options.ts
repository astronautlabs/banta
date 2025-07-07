import { InjectionToken, Type } from "@angular/core";
import { ChatBackendBase } from "./chat-backend-base";

export interface SdkOptions {
    serviceUrl?: string;
    emojiUrl?: string;
    backendClass?: Type<ChatBackendBase>
}

export const BANTA_SDK_OPTIONS = new InjectionToken<SdkOptions>('BANTA_SDK_OPTIONS');