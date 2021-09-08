import { User } from "./user";

export interface Vote {
    id : string;
    createdAt : number;
    user : User;
    ipAddress : string;
}
