import { Component, ElementRef, Output, ViewChild } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Component({
    selector: 'emoji-selector-button',
    template: `
        <button #button type="button" mat-icon-button (click)="show()">
            <mat-icon>emoji_emotions</mat-icon>
        </button>
        <emoji-selector-panel 
            #panel
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
            top: 2.5em;
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

        /* :host.bottom-left emoji-selector-panel {
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
        } */
    `]
})
export class EmojiSelectorButtonComponent {
    constructor(private elementRef: ElementRef<HTMLElement>) {

    }
    private _selected = new Subject<string>();
    private clickListener : any;
    private resizeListener : any;
    showEmojiPanel = false;

    @Output()
    get selected() : Observable<string> {
        return this._selected;
    }

    @ViewChild('panel', { read: ElementRef })
    panelElement : ElementRef<HTMLElement>;

    @ViewChild('button', { read: ElementRef })
    buttonElement : ElementRef<HTMLElement>;

    ngOnDestroy() {
        this.removeListener();
        this.panelElement.nativeElement.remove();
    }

    ngAfterViewInit() {
    }

    private putPanelAtRoot() {
        // If we are in full-screen, placing the panel outside of the full-screen element will result in it 
        // always being behind said full-screen element, so we need to ensure we never place it further up the 
        // stack.
        
        let root = document.fullscreenElement || document.body.querySelector('[ng-version]') || document.body;
        root.appendChild(this.panelElement.nativeElement);
    }

    private removeListener() {
        document.removeEventListener('click', this.clickListener);
        window.removeEventListener('resize', this.resizeListener);
    }

    place() {
        // Not currently used as it can't be easily done handling all 
        // scrolling corner cases.

        this.putPanelAtRoot();
        let pos = this.buttonElement.nativeElement.getBoundingClientRect();
        let size = this.panelElement.nativeElement.getBoundingClientRect();
        let left = window.scrollX + pos.left + pos.width - size.width;
        if (left < 0)
            left = (window.scrollX + window.innerWidth) / 2 - size.width / 2;
        let scrollY = window.scrollY;
        if (document.fullscreenElement) {
            
        }

        Object.assign(
            this.panelElement.nativeElement.style,
            {
                top: `${window.scrollY + pos.top + pos.height}px`,
                left: `${Math.max(0, left)}px`
            }
        );
    }

    show() {
        if (this.showEmojiPanel) {
            this.showEmojiPanel = false;
            return;
        }

        this.showEmojiPanel = true;
        //this.place();

        setTimeout(() => {
            this.resizeListener = () => {
                if (!this.showEmojiPanel)
                    return;
                this.place();
            };

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
            window.addEventListener('resize', this.resizeListener);
        });
    }

    insert(str) {
        this._selected.next(str);
    }
}