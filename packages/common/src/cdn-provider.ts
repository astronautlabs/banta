
export abstract class CDNProvider {
    /**
     * Upload an image to a CDN. Can throw an error if uploading isn't 
     * allowed (implementation of those checks left up to the provider)
     * @param image 
     */
    abstract uploadImage(image: Blob): Promise<string>;
}
