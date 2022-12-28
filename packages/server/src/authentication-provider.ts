
interface UserAccount {
    // TODO
}

export abstract class AuthenticationProvider {
    abstract validateToken(jwt : string) : Promise<UserAccount>;
    abstract getUsersByUsernames(names : string[]): Promise<UserAccount[]>;
    abstract getUsersByIds(ids : string[]): Promise<UserAccount[]>;
    abstract getUserByUsername(username : string): Promise<UserAccount>;
    abstract getUserById(uid : string): Promise<UserAccount>;
}
