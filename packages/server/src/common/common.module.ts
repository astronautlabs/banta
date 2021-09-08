import { EnvironmentService } from "./environment.service";
import { Module } from "@alterior/di";
import { AppConfig } from "./app-config";

@Module({
    providers: [
        EnvironmentService,
        AppConfig
    ]
})
export class CommonModule {

}