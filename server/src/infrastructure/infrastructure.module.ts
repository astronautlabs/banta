import { Module } from "@alterior/di";
import { DataStore } from "./datastore";

@Module({
    providers: [
        //FirebaseService,
        DataStore
    ]
})
export class InfrastructureModule {

}