
let sha1Core = require('sha1');

interface Sha1Options {
    asBytes?: boolean;
    asString?: boolean;
}

export function sha1(message: string | Buffer, options?: Sha1Options): string | Uint8Array {
    return sha1Core(message, options);
}
