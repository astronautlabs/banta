import { Module } from "@alterior/di";
import { FirebaseService } from "./firebase.service";
import { DataStore } from "./datastore";

@Module({
    providers: [
        FirebaseService,
        DataStore
    ]
})
export class InfrastructureModule {

}