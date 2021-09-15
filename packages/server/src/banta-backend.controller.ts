import { Controller } from "@alterior/web-server";
import { AccountsController } from "./accounts";
import { ChatController } from "./chat";

/**
 * 
 */
@Controller()
export class BantaBackendController {
    chat : ChatController;
    accounts : AccountsController;
}