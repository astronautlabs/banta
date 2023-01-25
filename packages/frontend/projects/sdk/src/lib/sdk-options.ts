import { InjectionToken } from "@angular/core";

export interface SdkOptions {
    serviceUrl?: string;
    emojiUrl?: string;
}

export const BANTA_SDK_OPTIONS = 'BANTA_SDK_OPTIONS';