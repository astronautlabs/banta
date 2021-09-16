import { Controller, Get, Mount } from "@alterior/web-server";
import { AccountsController } from "./accounts";
import { ChatController } from "./chat";

/**
 * 
 */
@Controller()
export class BantaBackendController {
    @Mount() chat : ChatController;
    @Mount() accounts : AccountsController;

    @Get()
    info() {
        return {
            service: '@banta/server'
        }
    }
}