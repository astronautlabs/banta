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

    private async getSetting<T>(id : string, defaultValue : T): Promise<T> {
        try {
            let doc = await firebase.firestore().doc(`/settings/${id}`).get();
            if (doc.exists) {
                return doc.data().value;
            }
        } catch (e) {
            console.warn(`Couldn't retrieve setting '${id}':`);
            console.warn(e);
        }

        return defaultValue;
    }

    alert(message: string) {
        alert(message);
    }

    async ngOnInit() {
        this.allowChangingTopic = await this.getSetting('allowChangingTopic', false);
        this.topicID = await this.getSetting('demoTopic', 'home4');
        this.newTopicID = this.topicID;
    }

    changeTopic() {
        this.topicID = this.newTopicID;
    }

    sharedMessage(message: ChatMessage) {
        this.alert(`messsage id: ${message.id} has been shared `)
    }
}
