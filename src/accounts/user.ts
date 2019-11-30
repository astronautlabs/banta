import { Storable } from "infrastructure";

export interface User extends Storable {
    id : string;
    displayName : string;
    username : string;
    avatarUrl? : string;
}
