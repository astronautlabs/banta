import { User } from './user';

export interface UserAccount extends User {
    email : string;
    createdAt : number;
    updatedAt : number;
}