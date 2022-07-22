import { InjectionToken } from "@angular/core";

export interface SdkOptions {
    serviceUrl?: string;
}

export const BANTA_SDK_OPTIONS = 'BANTA_SDK_OPTIONS';