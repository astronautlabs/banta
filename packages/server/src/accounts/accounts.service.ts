import { Injectable } from "@alterior/di";
import { v4 as uuid } from 'uuid';

import { Notification, NewUserAccount, UserAccount, SignUpResult, AuthenticationProvider, NotificationsProvider } from "@banta/common";
import { Logger } from "@alterior/logging";

export const GOOGLE_IDENTITY = 
    'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

const SECRET = 'abcdefghijklmnopqrstuvwxyz';

@Injectable()
export class AccountsService {
    constructor(
        private logger : Logger,
        private authProvider : AuthenticationProvider,
        private notificationsProvider : NotificationsProvider
    ) {
    }

    async validateToken(tokenStr : string): Promise<UserAccount> {
        return await this.authProvider.validateToken(tokenStr);
    }

    async getUsersByUsernames(names : string[]): Promise<UserAccount[]> {
        if (names.length > 20) 
            throw new Error(`Lookup via this method is limited to 20`);
        
        return await this.authProvider.getUsersByUsernames(names);
    }

    async getUsersByIds(ids : string[]): Promise<UserAccount[]> {
        if (ids.length > 20) 
            throw new Error(`Lookup via this method is limited to 20`);
        
        return await this.authProvider.getUsersByIds(ids);
    }

    async getUserByUsername(username : string): Promise<UserAccount> {
        return await this.authProvider.getUserByUsername(username);
    }

    async getUserById(uid : string): Promise<UserAccount> {
        return await this.authProvider.getUserById(uid);
    }

    async sendNotification(notification : Partial<Notification>) {
        if (!notification.recipientId)
            throw new Error(`No recipient provided`);
        
        if (!notification.type)
            throw new Error(`Notification must specify a type`);
        
        let finalNotification : Notification;


        await this.notificationsProvider.send(<Notification>Object.assign({}, notification, <Partial<Notification>>{
            id: uuid(),
            sentAt: Date.now()
        }));

        // XXX
        
        return finalNotification;
    }

    async startSSO() {
        // TODO: redirect to an SSO provider using any of: 
        // oauth, saml, discourse, etc
    }

    async signUp(userAccount : Partial<NewUserAccount>): Promise<SignUpResult> {
        throw new Error(`Not implemented`);

        // if (!userAccount.email)
        //     throw new Error(`No email provided in user description`);
        // if (!userAccount.password)
        //     throw new Error(`No password provided in user description`);
        // if (!userAccount.username)
        //     throw new Error(`No username provided in user description`);

        // let password = userAccount.password;
        // delete userAccount.password;
        // userAccount.createdAt = Date.now();
        // userAccount.updatedAt = Date.now();

        // let fbUser : firebaseAdmin.auth.UserRecord;

        // try {
        //     await this.datastore.transact(async txn => {
        //         let existingUser = await txn.read(`/usernames/${userAccount.username}`);
        //         if (existingUser) {
        //             throw { code: 'auth/username-already-exists', message: `Username ${userAccount.username} is not available` };
        //         }

        //         if (!fbUser) {
        //             try {
        //                 fbUser = await firebaseAdmin.auth()
        //                     .createUser({
        //                         email: userAccount.email,
        //                         password,
        //                         displayName: userAccount.displayName,
        //                         disabled: false 
        //                     })
        //                 ;
        //             } catch (e) {
        //                 this.logger.error(`Failed to create user on Firebase: code=${e.code}, message=${e.message}`);
        //                 throw e;
        //             }
        //         }

        //         userAccount.id = fbUser.uid;
        //         userAccount.uid = fbUser.uid;
            
        //         await txn.multiSet<UserAccount>(
        //             [
        //                 `/users/${fbUser.uid}`,
        //                 `/usernames/${userAccount.username}`
        //             ], 
        //             userAccount
        //         );
        //     });
        // } catch (e) {
        //     let expectedCodes = [
        //         // 'auth/email-already-exists',
        //         // 'auth/username-already-exists'
        //     ];

        //     if (!expectedCodes.includes(e.code)) {
        //         console.error(`Transaction for user signup (email=${userAccount.email}, username=${userAccount.username}) aborted:`);
        //         console.error(e);
        //     }

        //     if (fbUser) {
        //         // Crap, we made a user but overall the transaction failed.
        //         // Delete the user we created.

        //         console.error(`Deleting user ${fbUser.uid} created during failed user signup transaction (for email ${userAccount.email})`);
        //         await firebaseAdmin.auth().deleteUser(fbUser.uid);
        //     }

        //     throw e;
        // }

        // let token = await firebaseAdmin.auth().createCustomToken(
        //     fbUser.uid,
        //     {
        //         u: userAccount
        //     }
        // );

        // return {
        //     user: <UserAccount>userAccount,
        //     token
        // }
    }

}