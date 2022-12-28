import { Middleware } from "@alterior/web-server";
import type express from 'express';

@Middleware()
export class CORSMiddleware {
    constructor(
    ) {
    }

    handle(req : express.Request, res, next) {
        res.header("Access-Control-Allow-Origin", req.header('origin'));
        res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
        res.header("Access-Control-Allow-Methods", "PUT,POST,PATCH,GET,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Credentials", 'true');

        if (req.method === "OPTIONS") {
            res.sendStatus(200);
            return;
        }

        next();
    }
}