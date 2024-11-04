import { InjectionToken } from "@angular/core";

export interface SdkOptions {
    serviceUrl?: string;
    emojiUrl?: string;
}

export const BANTA_SDK_OPTIONS = new InjectionToken<SdkOptions>('BANTA_SDK_OPTIONS');