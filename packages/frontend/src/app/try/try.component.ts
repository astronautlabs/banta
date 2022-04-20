import { Component } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';

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
            console.error(`Caught error while fetching demo topic setting:`);
            console.error(e);
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
}