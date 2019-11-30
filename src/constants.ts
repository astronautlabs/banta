import * as path from "path";
import * as fs from "fs";

export const IS_DEV = true;
export const GCP_PROJECT_ID = 'engagechat-dev';

export const LOCAL_GCP_CREDENTIALS_FILE = path.join(__dirname, '..', 'private', 'firebase', 'credentials.json');

export const LOCAL_GCP_CREDENTIALS = fs.existsSync(LOCAL_GCP_CREDENTIALS_FILE) ? require(LOCAL_GCP_CREDENTIALS_FILE) : undefined;
export const FIREBASE_FIRESTORE_URL : string = "https://engagechat-dev.firebaseio.com";