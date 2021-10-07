import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';

export interface DemoOrganization {
    name : string;
}

export interface DemoContact {
    name : string;
}

export interface Demo {
    name? : string;
    internalName : string;
    organization? : DemoOrganization;
    contact? : DemoContact;
    roomId : string;
}

@Injectable()
export class DemoService {
    async get(id : string) : Promise<Demo> {
        let doc = await firebase.firestore().doc(`/demos/${id}`).get();

        if (doc.exists) {
            return <Demo>doc.data();
        }

        return null;
    }
}