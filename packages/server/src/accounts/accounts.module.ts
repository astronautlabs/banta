import { Module } from "@alterior/di";
import { LoggingModule } from "@alterior/logging";
import { InfrastructureModule } from "../infrastructure";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

@Module({
    imports: [
        LoggingModule,
        InfrastructureModule
    ],
    providers: [
        AccountsService
    ],
    controllers: [ AccountsController ]
})
export class AccountsModule {
}