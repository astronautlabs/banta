import { Module } from "@alterior/di";
import { ChatService } from "./chat.service";
import { ConsoleLogger, LoggingModule } from "@alterior/logging";
import { WebEvent } from "@alterior/web-server";
import { leftPad, rightPad } from "./utils";

import type * as express from 'express';

@Module({
    imports: [
        LoggingModule
    ],
    providers: [
        ChatService
    ]
})
export class ChatModule {

    /**
     * A console logger that is tailored for use with Banta.
     * To use this, simply pass it to the `listeners` property 
     * while configuring Alterior's `LoggingModule` in the root 
     * of your server application.
     */
    static CONSOLE_LOGGER = new ConsoleLogger(event => {
        let severityEmoji = `🟦`;
        if (event.severity === 'warning')
            severityEmoji = `🟨`;
        else if (event.severity === 'error')
            severityEmoji = `🟥`;
        else if (event.severity === 'fatal')
            severityEmoji = `🟧`;
        else if (event.severity === 'debug')
            severityEmoji = `⬜`;

        let contextLabel = event.contextLabel;

        if (WebEvent.current?.requestId && WebEvent.current.requestId === contextLabel) {
            let ip = (WebEvent.request as express.Request).ip;
            // ip = "2203:60:2d63:2ec::e51:8ac4";

            contextLabel = rightPad(`🌍 web  🎟️  ..${event.contextLabel.slice(-6)}  🛜  ${ip}`, 49);
        } else if (!contextLabel) {
            contextLabel = rightPad(`💻 core`, 46);
        }

        return `${event.date.toISOString()} ` 
            + `${contextLabel ? `${contextLabel} ` : ``}` 
            + `${leftPad(`${event.severity}`, 8)} ${severityEmoji} ` 
            + `${event.message}`
        ;
    })

}