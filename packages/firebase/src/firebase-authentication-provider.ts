import { AuthenticationProvider, UserAccount, Injectable } from "@banta/common";
import { FirebaseStoreRef } from "./firebase-store-ref";
import { JWT } from "@astronautlabs/jwt";

@Injectable()
export class FirebaseAuthenticationProvider extends AuthenticationProvider {
    constructor(
        private storeRef : FirebaseStoreRef
    ) {
        super();
    }

    get datastore() {
        return this.storeRef.store;
    }
    
    async validateToken(tokenStr : string): Promise<UserAccount> {
        let publicKeyUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
        let publicKeyResponse = await fetch(publicKeyUrl);
        let publicKey = await publicKeyResponse.json();

        let decodedToken = await JWT.validate(tokenStr, {
            algorithm: 'RS256',
            secretOrKey: publicKey
        });

        if (decodedToken.claims.u) {
            return decodedToken.claims.u;
        }
        
        let uid = decodedToken.claims.uid;
        //let user = await firebaseAdmin.auth().getUser(uid);
        
        return {
            id: uid,
            uid,
            createdAt: null,
            updatedAt: null,
            email: decodedToken.claims.email,
            displayName: null,
            avatarUrl: null,
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