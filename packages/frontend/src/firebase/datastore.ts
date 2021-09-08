import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

export interface Storable {
    id? : string;
}

export class Transaction {
    constructor(
        private store : DataStore,
        private txn : firebase.firestore.Transaction
    ) {
    }

    async create<T extends Storable>(collectionPath : string, data : T): Promise<T> {
        let firestore = this.store.firestore;
        let docRef = firestore.collection(collectionPath).doc();
        
        try {
            await this.txn.set(docRef, data);
        } catch (e) {
            console.error(`Caught error during datastore transaction.create('${collectionPath}', ...)`);
            console.error(e);
            
            console.groupCollapsed(`Debug information`);
            console.log(`Data being saved:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }
        data.id = docRef.id;
        return data;
    }
    
    async read<T extends Storable>(docPath : string): Promise<T> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        let snapshot : firebase.firestore.DocumentSnapshot;

        try {
            snapshot = await this.txn.get(docRef);
        } catch (e) {
            console.error(`Caught error during datastore transaction.read('${docPath}')`);
            console.error(e);
            
            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.groupEnd();
            throw e;
        }
        
        return snapshot.data() as T;
    }
    
    async update<T extends Storable>(docPath : string, data : T): Promise<void> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);
        
        try {
            await this.txn.update(docRef, data);
        } catch (e) {
            console.error(`Caught error during datastore transaction.update('${docPath}', ...)`);
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

    async set<T extends Storable>(docPath : string, data : T): Promise<void> {
        let firestore = this.store.firestore;
        let docRef = firestore.doc(docPath);

        try {
            await this.txn.set(docRef, data);
        } catch (e) {
            console.error(`Caught error during datastore transaction.set('${docPath}', ...)`);
            console.error(e);

            console.groupCollapsed(`Debug information`);
            console.dir(`Object view of error:`);
            console.dir(e);
            console.log(`Data being set:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }
        
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

export interface Query<T> {
    where(fieldName : string, operator : string, value : any): Query<T>;
    get() : Promise<T[]>;
}

class FirebaseQuery<T> implements Query<T> {
    constructor(
        private _query : firebase.firestore.Query
    ) {
    }

    where(fieldName : string, operator : string, value : any) {
        return new FirebaseQuery<T>(this._query.where(fieldName, operator as any, value));
    }

    async get() {
        let snapshot = await this._query.get();
        return snapshot.docs.map(x => x.data()) as T[];
    }
}

@Injectable()
export class DataStore {
    constructor(
        private afStore : AngularFirestore
    ) {
    }

    public get firestore() {
        return this.afStore.firestore;
    }

    async create<T extends Storable>(collectionPath : string, data : T): Promise<T> {
        let colRef = this.firestore.collection(collectionPath);
        let docRef : firebase.firestore.DocumentReference;
        
        try {
            docRef = await colRef.add(data);
        } catch (e) {
            console.error(`Caught error during datastore.create('${collectionPath}', ...)`);
            console.error(e);

            console.groupCollapsed(`Debug information`);
            console.dir(`Object view of error:`);
            console.dir(e);
            console.log(`Data being set:`);
            console.dir(data);
            console.groupEnd();
            throw e;
        }
        
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
        let docRef = this.firestore.doc(docPath);
        let snap : firebase.firestore.DocumentSnapshot;


        try {
            snap = await docRef.get();
        } catch (e) {
            console.error(`Caught error during datastore.read('${docPath}')`);
            console.error(e);
            
            console.groupCollapsed('Debug Details');
            console.dir(`Object view of error:`);
            console.dir(e);
            console.groupEnd();
            throw e;
        }

        let t = snap.data() as T;
        if (t) 
            t.id = docRef.id;
        return t;
    }

    query<T extends Storable>(collectionPath : string): Query<T> {
        return new FirebaseQuery(this.firestore.collection(collectionPath));
    }

    async listAll<T extends Storable>(collectionPath : string, limit? : number, startAfter? : string): Promise<T[]> {

        let collectionRef : firebase.firestore.Query = this.firestore.collection(collectionPath);

        if (startAfter)
            collectionRef = collectionRef.startAfter(this.firestore.doc(startAfter));

        if (limit !== undefined && limit !== null)
            collectionRef = collectionRef.limit(limit);

        let snap : firebase.firestore.QuerySnapshot;
        
        try {
            snap = await collectionRef.get({

            });
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

    async mirrorInTransaction(txn : Transaction, primaryKey : string, mirrorKeys : string[], data?): Promise<void> {
        try {
            if (!data)
                data = await txn.read(primaryKey);
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
            await Promise.all(mirrorKeys.map(key => txn.set(key, data)));
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
        
        await this.transact(async txn => {
            try {
                record = await txn.create(collectionPath, data);
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
            
            await this.mirrorInTransaction(
                txn, 
                `${collectionPath}/${record.id}`, 
                mirrorKeys.map(key => key.replace(/:id/g, record.id)),
                record
            );
        });

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

    async multiUpdate<T extends Storable>(docPaths : string[], data : T): Promise<void> {
        try {
            await Promise.all(docPaths.map(path => this.update(path, data)));
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