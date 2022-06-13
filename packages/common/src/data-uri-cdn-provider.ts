import { CDNProvider } from "./cdn-provider";

/**
 * Provides a CDNProvider implementation that simply returns `data:` URIs.
 * Such an implementation is very simple but not recommended for production
 * deployments of Banta.
 */
export class DataURICDNProvider extends CDNProvider {
    async uploadImage(image: Blob): Promise<string> {
        return URL.createObjectURL(image);
    }
}