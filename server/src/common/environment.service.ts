import { Injectable } from "injection-js";
import { EnvironmentVariables } from "./environment-variables";
import * as process from 'process';

@Injectable()
export class EnvironmentService {
    get() : EnvironmentVariables {
        return Object.assign(
            {
                URL: 'https://48c017da.ngrok.io'
            }, 
            process.env as any || {}
        );
    }
}