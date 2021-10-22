import { Component, Input, Output } from "@angular/core";
import { ChatMessage, ChatSource, User } from "@banta/common";
import { Subject } from "rxjs";

@Component({
    selector: 'banta-comment-field',
    templateUrl: './comment-field.component.html',
    styleUrls: ['./comment-field.component.scss']
})
export class CommentFieldComponent {

    @Input() source : ChatSource;
    @Input() user : User;
    @Input() canComment = true;

    @Output() signInSelected = new Subject<void>();
    @Output() editAvatarSelected = new Subject<void>();

    sending = false;
    sendError : Error;
    expandError = false;
    text : string = '';
    @Input() sendLabel = 'Send';
    @Input() sendingLabel = 'Sending';
    @Input() label = 'Post a comment';
    @Input() permissionDeniedLabel = 'Unavailable'
    @Input() signInLabel = 'Sign In';

    indicateError(message : string) {
        this.sendError = new Error(message);
        setTimeout(() => {
            this.expandError = true;
            setTimeout(() => {
                this.expandError = false;
            }, 5*1000);
        });
    }

    onKeyDown(event : KeyboardEvent) {
    }

    insertEmoji(text : string) {
        this.text += text;
    }

    showSignIn() {
        this.signInSelected.next();
    }

    showEditAvatar() {
        this.editAvatarSelected.next();
    }

    async sendMessage() {
        if (!this.source)
            return;
        
        this.sending = true;
        this.sendError = null;
        try {
            let text = (this.text || '').trim();

            if (text === '')
                return;

            let message : ChatMessage = {
                user: this.user,
                sentAt: Date.now(),
                upvotes: 0,
                message: text
            };

            try {
                await this.source.send(message);
                this.text = '';
            } catch (e) {
                this.indicateError(`Could not send: ${e.message}`);
                console.error(`Failed to send message: `, message);
                console.error(e);
            }
        } finally {
            this.sending = false;
        }
    }

}