import { Component, ElementRef, Input, Output, ViewChild } from "@angular/core";
import { ChatMessage, ChatSource, User } from "@banta/common";
import { Subject } from "rxjs";
import { EMOJIS } from "../../emoji";

export interface AutoCompleteOption {
    label : string;
    action? : () => void;
}

export interface HashTag {
    hashtag : string;
    description : string;
}

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
    @ViewChild('autocomplete') autocompleteEl : ElementRef<HTMLElement>;
    @ViewChild('autocompleteContainer') autocompleteContainerEl : ElementRef<HTMLElement>;
    @ViewChild('textarea') textareaEl : ElementRef<HTMLTextAreaElement>;

    @Input() hashtags : HashTag[];
    @Input() participants : User[] = [];

    ngAfterViewInit() {
        let root = document.body.querySelector('[ng-version]') || document.body;
        root.appendChild(this.autocompleteEl.nativeElement);
    }

    showAutoComplete(options : AutoCompleteOption[]) {
        this.autoCompleteSelected = 0;
        this.autocompleteOptions = options;
        let pos = this.autocompleteContainerEl.nativeElement.getBoundingClientRect();
        let size = this.autocompleteEl.nativeElement.getBoundingClientRect();

        this.autocompleteEl.nativeElement.style.left = `${window.scrollX + pos.left}px`;
        this.autocompleteEl.nativeElement.style.top = `${window.scrollY + pos.top}px`;
        this.autocompleteEl.nativeElement.style.width = `${pos.width}px`;
        this.autocompleteVisible = true;
    }

    autocompleteVisible = false;
    autocompleteOptions : AutoCompleteOption[] = [];

    activateAutoComplete(option : AutoCompleteOption) {
        option.action();
        this.dismissAutoComplete();
    }

    dismissAutoComplete() {
        this.autocompleteVisible = false;
        this.completionFunc = null;
        this.completionPrefix = '';
    }

    indicateError(message : string) {
        this.sendError = new Error(message);
        setTimeout(() => {
            this.expandError = true;
            setTimeout(() => {
                this.expandError = false;
            }, 5*1000);
        });
    }

    completionFunc : (str : string) => AutoCompleteOption[];

    completionPrefix : string;
    autoCompleteSelected : number = 0;

    async autocomplete(replacement : string) {
        let el = this.textareaEl.nativeElement;
        this.text = this.text.slice(0, el.selectionStart - this.completionPrefix.length) + replacement + this.text.slice(el.selectionStart);
    }

    async insert(str : string) {
        let el = this.textareaEl.nativeElement;
        this.text = this.text.slice(0, el.selectionStart) + str + this.text.slice(el.selectionStart);
    }

    async onKeyDown(event : KeyboardEvent) {
        console.log(event.key);


        if (this.autocompleteVisible) {
            if (event.key === 'Escape') {
                this.dismissAutoComplete();
                return;
            }

            if (event.key === 'Shift') {
                return;
            }

            if (event.key === 'Enter') {
                this.activateAutoComplete(this.autocompleteOptions[this.autoCompleteSelected]);
                event.stopPropagation();
                event.preventDefault();
                return;
            }

            if (event.key === 'ArrowUp') {
                if (this.autoCompleteSelected === 0)
                    this.autoCompleteSelected = this.autocompleteOptions.length - 1;
                else
                    this.autoCompleteSelected = this.autoCompleteSelected - 1;
                event.stopPropagation();
                event.preventDefault();
                return;
            } else if (event.key === 'ArrowDown') {
                this.autoCompleteSelected = (this.autoCompleteSelected + 1) % this.autocompleteOptions.length;
                event.stopPropagation();
                event.preventDefault();
                return;
            }
        }

        if (event.key === 'Enter' && event.ctrlKey) {
            await this.sendMessage();
            return;
        }
        
        if (this.completionFunc) {
            if (event.key === 'Backspace') {
                this.completionPrefix = this.completionPrefix.slice(0, this.completionPrefix.length - 1);

                if (this.completionPrefix === '') {
                    this.dismissAutoComplete();
                    return;
                }
            } else if (event.key === ' ' || event.key.length > 1) {
                this.dismissAutoComplete();
                return;
            } else {
                this.completionPrefix += event.key;
            }

            this.showAutoComplete(this.completionFunc(this.completionPrefix));
        } else {
            if (event.key === ':') {
                this.startAutoComplete(event, prefix => {
                    prefix = prefix.slice(1);

                    // makes :-), :-( etc work (as they are ":)" etc in the db)
                    if (prefix.startsWith('-'))
                        prefix = prefix.slice(1);
        
                    return Object.keys(EMOJIS)
                        .filter(k => k.includes(prefix) || EMOJIS[k].keywords.some(kw => kw.includes(prefix)))
                        .map(k => ({
                            label: `${EMOJIS[k].char} ${k}`,
                            action: () => this.autocomplete(EMOJIS[k].char)
                        }))
                        .slice(0, 5)
                    ;
                });
            } else if (event.key === '@') {
                this.startAutoComplete(event, prefix => {
                    prefix = prefix.slice(1);
                    return this.participants.filter(x => x.username.includes(prefix))
                        .map(p => ({
                            label: `@${p.username} -- ${p.displayName}`,
                            action: () => this.autocomplete(`@${p.username}`)
                        }))
                    ;
                });
            } else if (event.key === '#') {
                this.startAutoComplete(event, prefix => {
                    prefix = prefix.slice(1);
        
                    return this.hashtags
                        .filter(ht => ht.hashtag.includes(prefix))
                        .map(ht => ({
                            label: `#${ht.hashtag}${ht.description ? ` -- ${ht.description}` : ``}`,
                            action: () => this.autocomplete(`#${ht.hashtag}`)
                        }))
                        .slice(0, 5)
                    ;
                });
            }
        }
    }

    startAutoComplete(event : KeyboardEvent, completionFunc : (str : string) => AutoCompleteOption[]) {
        this.completionPrefix = event.key;
        this.completionFunc = completionFunc;
        this.showAutoComplete(this.completionFunc(this.completionPrefix));
    }

    onBlur() {
        setTimeout(() => this.dismissAutoComplete(), 250);
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