import { CDNProvider } from "./cdn-provider";

/**
 * Provides a CDNProvider implementation that simply returns `data:` URIs.
 * Such an implementation is very simple but not recommended for production
 * deployments of Banta.
 */
export class DataURICDNProvider extends CDNProvider {
    async uploadImage(image: Blob): Promise<string> {
        await new Promise(r => setTimeout(r, 3000));

        return await new Promise<string>(resolve => {

            let reader = new FileReader(); 
            reader.onload = (ev) => resolve(<string>ev.target.result);
            reader.readAsDataURL(image);
        });
    }
}