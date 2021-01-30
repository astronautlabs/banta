import { Injectable } from "@alterior/di";
import { EnvironmentService } from "./environment.service";

@Injectable()
export class AppConfig {
    constructor(
        env : EnvironmentService
    ) {
        this.selectEnvironment(env.get().ENVIRONMENT || 'development')
    }

    private _environment : string;
    private _frontendUrl : string;
    private _platformUrl : string;

    selectEnvironment(env : string) {
        this._environment = env;

        switch (env) {
            case 'development':
                this._frontendUrl = 'http://localhost:4201';
                this._platformUrl = 'http://localhost:3000';
                break;
            case 'staging':
                this._frontendUrl = 'https://staging.bantachat.com';
                this._platformUrl = 'https://platform.staging.bantachat.com';
                break;
            case 'production':
                this._frontendUrl = 'https://bantachat.com';
                this._platformUrl = 'https://platform.bantachat.com';
                break;
        }
    }

    get environment() {
        return this._environment;
    }

    get frontendUrl() {
        return this._frontendUrl;
    }

    get platformUrl() {
        return this._platformUrl;
    }
}