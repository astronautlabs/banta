import { Component } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import {ChatMessage} from "@banta/common";

@Component({
    templateUrl: './try.component.html',
    styleUrls: ['./try.component.scss']
})
export class TryComponent {
    topicID : string;
    newTopicID : string;

    allowChangingTopic = false;

    alert(message: string) {
        alert(message);
    }

    async ngOnInit() {
        this.allowChangingTopic = true;
        this.topicID = 'home';
        this.newTopicID = this.topicID;
    }

    changeTopic() {
        this.topicID = this.newTopicID;
    }

    sharedMessage(message: ChatMessage) {
        this.alert(`messsage id: ${message.id} has been shared `)
    }
}
