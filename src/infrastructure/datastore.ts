import { Injectable } from "injection-js";
import * as firebaseAdmin from 'firebase-admin';
import { FirebaseServiceX } from "./firebase.service";
import { Storable } from "./storable";

export class Transaction {
    constructor(
        private store : DataStore,
        private txn : FirebaseFirestore.Transaction
    ) {
    }

    async create<T extends Storable>(collectionPath : string, data : T): Promise<T> {
        let firestore = this.store.firestore;
        let docRef = firestore.collection(collectionPath).doc();
        await this.txn.set(docRef, data);
        data.id = docRef.id;
        return data;
    }
    
    async read<T extends Storable>(docPath : string): Promise<T> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        let snapshot = await this.txn.get(docRef);
        let t = snapshot.data() as T;
        if (t)
            t.id = docRef.id;
        
        return t;
    }
    
    async multiCreate<T extends Storable>(docPaths : string[], data : Partial<T>): Promise<void> {
        await Promise.all(
            docPaths
                .map(x => x.replace(/:id/g, data.id))
                .map(x => this.create(x, data))
        );
    }
    
    async multiSet<T extends Storable>(docPaths : string[], data : Partial<T>): Promise<void> {
        await Promise.all(
            docPaths
                .map(x => x.replace(/:id/g, data.id))
                .map(x => this.set(x, data))
        );
    }

    async multiUpdate<T extends Storable>(docPaths : string[], data : Partial<T>): Promise<void> {
        await Promise.all(
            docPaths
                .map(x => x.replace(/:id/g, data.id))
                .map(x => this.update(x, data))
        );
    }

    async update<T extends Storable>(docPath : string, data : Partial<T>): Promise<void> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        await this.txn.set(docRef, data, { merge: true });
    }

    async updateExisting<T extends Storable>(docPath : string, data : Partial<T>): Promise<void> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        await this.txn.set(docRef, data);
    }

    async set<T extends Storable>(docPath : string, data : T): Promise<void> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        await this.txn.set(docRef, data);
    }

    async delete(docPath : string) {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        this.txn.delete(docRef);
    }

    async readAll(docPaths : string[]): Promise<any[]> {
        let firestore = this.store.firestore;
        let docRefs = docPaths.map(docPath => firestore.doc(docPath));
        let snapshots = await Promise.all(docRefs.map(x => this.txn.get(x)));
        return snapshots.map(x => x.data());
    }
}

@Injectable()
export class DataStore {
    constructor(
        private firebase : FirebaseServiceX
    ) {
    }

    public get firestore() {
        return firebaseAdmin.firestore();
    }

    async create<T extends Storable>(collectionPath : string, data : T): Promise<T> {
        let colRef = this.firestore.collection(collectionPath);
        let docRef = await colRef.add(data);
        
        data.id = docRef.id;
        return data;
    }

    async transact<T>(handler : (txn : Transaction) => Promise<T>) {
        return await this.firestore.runTransaction(async fsTxn => {
            let txn = new Transaction(this, fsTxn);
            return await handler(txn);
        });
    }
    
    async read<T extends Storable>(docPath : string): Promise<T> {
        let documentRef = this.firestore.doc(docPath);
        let snapshot = await documentRef.get();
        let data = snapshot.data() as T;

        if (!data)
            return null;
        
        data.id = documentRef.id;
        return data;
    }

    async listAll<T extends Storable>(collectionPath : string, limit? : number, startAfter? : string): Promise<T[]> {
        let collectionRef : firebaseAdmin.firestore.Query = this.firestore.collection(collectionPath);
        
        if (startAfter !== undefined)
            collectionRef = collectionRef.startAfter(this.firestore.doc(startAfter));

        if (limit !== undefined)
            collectionRef = collectionRef.limit(limit);

        let snap : firebaseAdmin.firestore.QuerySnapshot;
        
        try {
            snap = await collectionRef.get();
        } catch (e) {
            console.error(`Caught error during datastore.listAll('${collectionPath}')`);
            console.error(e);
            
            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.groupEnd();
            throw e;
        }

        return snap
            .docs
            .map(x => Object.assign(
                {}, 
                x.data(), 
                { id: x.id }
            )
        ) as T[];
    }

    async update<T extends Storable>(docPath : string, data : Partial<T>): Promise<void> {
        docPath = docPath.replace(/:id\b/g, data.id);
        let docRef = this.firestore.doc(docPath);
        
        try {
            await docRef.set(data, { merge: true });
        } catch (e) {
            console.error(`Caught error during datastore.update('${docPath}', ...)`);
            console.error(e);

            console.groupCollapsed(`Debug information`);
            console.dir(`Object view of error:`);
            console.dir(e);
            console.log(`Data being updated:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }
    }
    
    async delete(docPath : string): Promise<void> {
        let docRef = this.firestore.doc(docPath);
        
        try {
            await docRef.delete();
        } catch (e) {
            console.error(`Caught error during datastore.delete('${docPath}')`);
            console.error(e);

            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.groupEnd();
            throw e;
        }
    }

    async mirror(primaryKey : string, mirrorKeys : string[], data?): Promise<void> {
        let primaryRef = this.firestore.doc(primaryKey);
        let mirrorRefs = mirrorKeys.map(x => this.firestore.doc(x));

        try {
            if (!data)
                data = (await primaryRef.get()).data();
        } catch (e) {
            console.error(`Caught error while fetching content for mirroring from '${primaryKey}' (would have mirrored to ${mirrorKeys.length} keys: ${mirrorKeys.join(', ')})`);
            console.error(e);

            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.groupEnd();
            throw e;
        }

        if (!data)
            throw new Error(`No such object ${primaryKey}`);
        
        try {
            await Promise.all(mirrorRefs.map(ref => ref.set(data)));
        } catch (e) {
            console.error(`Caught error while mirroring content from '${primaryKey}' to ${mirrorKeys.length} keys: ${mirrorKeys.join(', ')}`);
            console.error(e);
            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.log(`The data being mirrored:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }
    }

    async createAndMirror<T extends Storable>(collectionPath : string, data : T, mirrorKeys : string[]): Promise<T> {
        let record : T;
        
        try {
            record = await this.create(collectionPath, data);
        } catch (e) {
            console.error(`Caught error while creating entry in '${collectionPath}' (and mirroring to ${mirrorKeys.length} keys: ${mirrorKeys.join(', ')})`);
            console.error(e);
            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.log(`The data being written:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }

        await this.mirror(`${collectionPath}/${record.id}`, mirrorKeys.map(key => key.replace(/:id/g, record.id), record));
        return record;
    }

    async multiUpdate<T extends Storable>(docPaths : string[], data : Partial<T>): Promise<void> {

        try {
            await Promise.all(docPaths.map(path => this.update(path.replace(/:id\b/g, data.id), data)));
        } catch (e) {            
            console.error(`Caught error during multi-update to ${docPaths.length} keys: ${docPaths.join(', ')})`);
            console.error(e);
            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.log(`The data being written:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }
    }
}