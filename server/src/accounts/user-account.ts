import { User } from "./user";

export interface UserAccount extends User {
    uid : string;
    email : string;
    createdAt : number;
    updatedAt : number;
}
