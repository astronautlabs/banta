import { Component, ElementRef, HostBinding, ViewChild } from '@angular/core';
import {ChatMessage} from "@banta/common";
import { ChatBackendBase } from '@banta/sdk';

@Component({
    templateUrl: './try.component.html',
    styleUrls: ['./try.component.scss']
})
export class TryComponent {
    constructor(
        private chatBackend: ChatBackendBase
    ) {
    }

    topicID: string;
    newTopicID: string;
    messageCount: number;

    @HostBinding('class.small-mode')
    isSmallMode = false;

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
