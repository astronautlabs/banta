import { Module } from "@alterior/di";
import { LoggingModule } from "@alterior/logging";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

@Module({
    imports: [
        LoggingModule
    ],
    providers: [
        AccountsService
    ]
})
export class AccountsModule {
}