import { createDataStore, DataStore } from "@astronautlabs/datastore-firestore";
import { Injectable } from "@alterior/di";

@Injectable()
export class FirebaseStoreRef {
    constructor() {
    }

    private _store : DataStore;

    get store() : DataStore {
        if (this._store)
            return this._store;
        
        try {
            return this._store = createDataStore();
        } catch (e) {
            
        }
    }
}