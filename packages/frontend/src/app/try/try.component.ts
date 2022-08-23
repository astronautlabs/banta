import { Component, ElementRef, HostBinding, ViewChild } from '@angular/core';
import {ChatMessage} from "@banta/common";
import { ChatBackendBase } from '@banta/sdk';

const DEFAULT_CUSTOM_THEME = `
.use-custom-theme banta-comment-view .message-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

.use-custom-theme banta-comment .actions .spacer {
    order: 99;
}

.use-custom-theme banta-comment .actions.actions {
    margin-left: 0;
}

.use-custom-theme banta-comment .message-content.message-content .content.content {
    border: 1px solid #666;
    padding: 1em;
    margin: 0.5em 0;
}
`

@Component({
    templateUrl: './try.component.html',
    styleUrls: ['./try.component.scss']
})
export class TryComponent {
    constructor(
        private chatBackend: ChatBackendBase,
        private element: ElementRef<HTMLElement>
    ) {
    }

    private customThemeElement: HTMLStyleElement;

    ngAfterViewInit() {
        console.log(`Installing`);
        this.customThemeElement = document.createElement('style');
        this.customThemeElement.textContent = this.customTheme;
        this.element.nativeElement.appendChild(this.customThemeElement);
    }

    topicID: string;
    newTopicID: string;
    messageCount: number;
    useInlineReplies = true;
    
    _customTheme = DEFAULT_CUSTOM_THEME;

    get customTheme() {
        return this._customTheme;
    }

    set customTheme(value) {
        this._customTheme = value;
        this.customThemeElement.textContent = this._customTheme;
    }

    @HostBinding('class.small-mode')
    isSmallMode = false;
    
    @HostBinding('class.use-custom-theme')
    useCustomTheme = false;

    allowChangingTopic = false;

    alert(message: string) {
        alert(message);
    }

    @ViewChild('fullscreenElement')
    fullscreenElement: ElementRef<HTMLElement>;

    get isFullScreen() {
        return !!document.fullscreenElement;
    }

    exitFullScreen() {
        document.exitFullscreen();
    }
    
    goFullScreen() {
        
        let element = this.fullscreenElement.nativeElement;

        if (element.requestFullscreen)
            element.requestFullscreen();
        else if (element['webkitRequestFullscreen'])
            element['webkitRequestFullscreen']();
        else if (element['mozRequestFullScreen'])
            element['mozRequestFullScreen']();
        else if (element['msRequestFullscreen'])
            element['msRequestFullscreen']();
    }

    async ngOnInit() {
        this.allowChangingTopic = true;
        this.topicID = 'home_comments';
        this.newTopicID = this.topicID;
        
        this.messageCount = await this.chatBackend.getSourceCountForTopic(this.topicID);
        console.log(this.messageCount);
    }

    changeTopic() {
        this.topicID = this.newTopicID;
    }

    sharedMessage(message: ChatMessage) {
        this.alert(`messsage id: ${message.id} has been shared `)
    }

    reportedMessage(message: ChatMessage) {
        alert(`Message ${message.id} was reported`);
    }

    permissionDenied(message: string) {
        alert(`App should handle: '${message}'`);
    }
}
