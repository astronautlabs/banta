import { UserAccount } from "./user-account";

export interface NewUserAccount extends UserAccount {
    password : string;
}