import { Component, Output } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Component({
    selector: 'emoji-selector-button',
    template: `
        <button mat-icon-button (click)="show()">
            <mat-icon>emoji_emotions</mat-icon>
        </button>
        <emoji-selector-panel 
            (selected)="insert($event)"
            [class.visible]="showEmojiPanel"
            ></emoji-selector-panel>
    `,
    styles: [`
        :host {
            display: block;
            position: relative;
        }

        emoji-selector-panel {
            position: absolute;
            bottom: 2.5em;
            right: 0;
            opacity: 0;
            pointer-events: none;
            z-index: 10;
        }

        emoji-selector-panel.visible {
            pointer-events: initial;
            opacity: 1;
        }

        button {
            color: #666
        }

        :host.bottom-left emoji-selector-panel {
            right: auto;
            left: 0;
        }

        :host.top-right emoji-selector-panel {
            top: 2.4em;
            bottom: auto;
        }

        :host.top-left emoji-selector-panel {
            top: 2.4em;
            bottom: auto;
            left: 0;
            right: auto;
        }
    `]
})
export class EmojiSelectorButtonComponent {

    private _selected = new Subject<string>();

    @Output()
    get selected() : Observable<string> {
        return this._selected;
    }

    ngOnDestroy() {
        this.removeListener();
    }

    private removeListener() {
        document.removeEventListener('click', this.clickListener);
    }

    show() {
        if (this.showEmojiPanel) {
            this.showEmojiPanel = false;
            return;
        }

        this.showEmojiPanel = true;

        setTimeout(() => {
            this.clickListener = (ev : MouseEvent) => {

                let parent = <HTMLElement> ev.target;
                let isInDialog = false;
                
                while (parent) {
                    if (parent.matches('emoji-selector-panel'))
                        isInDialog = true;

                    parent = parent.parentElement;
                }

                if (isInDialog)
                    return;

                this.showEmojiPanel = false;
                this.removeListener();
            };
    
            document.addEventListener('click', this.clickListener);
        });
    }

    private clickListener : any;

    showEmojiPanel = false;

    insert(str) {
        this._selected.next(str);
    }
}