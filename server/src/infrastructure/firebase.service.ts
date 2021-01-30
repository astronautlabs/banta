import * as path from "path";
import { GCP_PROJECT_ID, LOCAL_GCP_CREDENTIALS_FILE, LOCAL_GCP_CREDENTIALS, FIREBASE_FIRESTORE_URL } from "../constants";
import { Injectable } from "injection-js";
import * as firebaseAdmin from "firebase-admin";
import * as firebase from 'firebase';

@Injectable()
export class FirebaseServiceX {
    constructor() {
        let firebaseOptions : firebaseAdmin.AppOptions = {
            projectId: GCP_PROJECT_ID,
            databaseURL: FIREBASE_FIRESTORE_URL
        };
        
        if (LOCAL_GCP_CREDENTIALS)
            firebaseOptions.credential = firebaseAdmin.credential.cert(LOCAL_GCP_CREDENTIALS);
        
        firebaseAdmin.initializeApp(firebaseOptions);
        firebase.initializeApp(firebaseOptions);
    }

    get XfirebaseAdmin() {
        return firebaseAdmin;
    }

    get Xfirebase() {
        return firebase;
    }
}