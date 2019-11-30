export interface User {
    id : string;
    displayName : string;
    username : string;
    avatarUrl? : string;
}

export interface UserAccount extends User {
    email : string;
    createdAt : number;
    updatedAt : number;
}