/// <reference types="@types/resize-observer-browser" />

import { FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, HostBinding, Output, ViewChild, Input } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { EmojiSelectorPanelComponent } from './emoji-selector-panel/emoji-selector-panel.component';

@Component({
    selector: 'emoji-selector-button',
    template: `
        <button #button type="button" mat-icon-button (click)="show()">
            <mat-icon>emoji_emotions</mat-icon>
        </button>
        <ng-template cdkPortal #selectorPanelTemplate="cdkPortal">
            <emoji-selector-panel 
                #panel
                (selected)="insert($event)"
                ></emoji-selector-panel>
        </ng-template>
    `,
    styles: [`
        :host {
            display: block;
            position: relative;
        }

        button {
            color: #666
        }
    `]
})
export class EmojiSelectorButtonComponent {
    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private overlay: Overlay
    ) {
    }

    @ViewChild('selectorPanelTemplate') selectorPanelTemplate: TemplatePortal<any>;

    private _selected = new Subject<string>();
    showEmojiPanel = false;

    @Output()
    get selected() : Observable<string> {
        return this._selected;
    }

    private overlayRef: OverlayRef;

    get isOpen() {
        return this.overlayRef;
    }

    /**
     * Insert the given emoji.
     * @param str 
     */
    insert(str) {
        this._selected.next(str);
    }

    close() {
        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = null;
            return;
        }
    }

    @Input() overlayX: 'start' | 'center' | 'end' = 'end';
    @Input() overlayY: 'top' | 'center' | 'bottom' = 'top';

    show() {
        if (this.isOpen) {
            this.close();
        }

        this.overlayRef = this.overlay.create({
            positionStrategy: this.overlay.position()
                .flexibleConnectedTo(this.elementRef)
                .withPositions([
                    { 
                        originX: 'end', 
                        originY: 'bottom',
                        overlayX: this.overlayX,
                        overlayY: this.overlayY
                    }
                ])
                .withFlexibleDimensions(true),
            hasBackdrop: true,
            disposeOnNavigation: true,
            scrollStrategy: this.overlay.scrollStrategies.reposition({
                autoClose: true
            })
        });

        this.overlayRef.backdropClick().subscribe(() => {
            this.close();
        })

        this.overlayRef.keydownEvents().subscribe(event => {
            if (event.key === 'Escape') {
                this.close();
            }
        });
        this.overlayRef.attach(this.selectorPanelTemplate);
    }
}