import { AuthenticationProvider, UserAccount } from "../accounts";
import * as firebaseAdmin from 'firebase-admin';
import { DataStore } from "@astronautlabs/datastore";

export class FirebaseAuthenticationProvider extends AuthenticationProvider {
    constructor(
        private datastore : DataStore
    ) {
        super();
    }
    
    async validateToken(tokenStr : string): Promise<UserAccount> {
        console.log('validateToken()');
        let decodedToken = await firebaseAdmin.auth().verifyIdToken(tokenStr);

        console.log(`validateToken with response`);
        if (decodedToken.u) {
            console.log(`user in token:`);
            console.dir(decodedToken.u);
            return decodedToken.u;
        }
        
        let uid = decodedToken.uid;
        let user = await firebaseAdmin.auth().getUser(uid);
        
        return {
            id: uid,
            uid,
            createdAt: null,
            updatedAt: null,
            email: user.email,
            displayName: user.displayName || null,
            avatarUrl: user.photoURL || null,
            username: 'bob' // TODO
        }
    }

    async getUsersByUsernames(names : string[]): Promise<UserAccount[]> {
        if (names.length > 20) 
            throw new Error(`Lookup via this method is limited to 20`);
        
        return await Promise.all(
            names.map(name => this.getUserByUsername(name))
        );
    }

    async getUsersByIds(ids : string[]): Promise<UserAccount[]> {
        if (ids.length > 20) 
            throw new Error(`Lookup via this method is limited to 20`);
        
        return await Promise.all(
            ids.map(id => this.getUserById(id))
        );
    }

    async getUserByUsername(username : string): Promise<UserAccount> {
        return await this.datastore.read<UserAccount>(`/usernames/${username}`);
    }

    async getUserById(uid : string): Promise<UserAccount> {
        return await this.datastore.read<UserAccount>(`/users/${uid}`);
    }

}