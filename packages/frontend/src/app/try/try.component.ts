import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, HostBinding, inject, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {ChatMessage} from "@banta/common";
import { BantaCommentsComponent, ChatBackendBase } from '@banta/sdk';
import { MessageMenuItem } from 'projects/sdk/src/lib';

const DEFAULT_CUSTOM_THEME = `
.use-custom-theme banta-comment-view .banta-message-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

.use-custom-theme banta-comment .banta-actions .spacer {
    order: 99;
}

.use-custom-theme banta-comment .banta-actions.banta-actions {
    margin-left: 0;
}

.use-custom-theme banta-comment .banta-message-content.banta-message-content .banta-content.banta-content {
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
    private chatBackend = inject(ChatBackendBase);
    private element = inject(ElementRef) as ElementRef<HTMLElement>;
    private overlay = inject(Overlay);
    private route = inject(ActivatedRoute);

    @ViewChild('comments')
    comments: BantaCommentsComponent;

    private customThemeElement: HTMLStyleElement;

    ngAfterViewInit() {
        this.customThemeElement = document.createElement('style');
        this.customThemeElement.textContent = this.customTheme;
        this.element.nativeElement.appendChild(this.customThemeElement);
    }

    customMenuItems: MessageMenuItem[] = [
        {
            icon: 'home',
            label: 'Dump comment to console',
            action(message: ChatMessage) {
                alert(`Comment has been dumped to console.`);
                console.log(`Comment ${message.id}:`);
                console.dir(message);
            }
        }
    ];

    topicID: string;
    maxVisibleMessages = 200;
    maxMessages = 2000;
    jumpedCommentId: string;
    newTopicID: string;
    messageCount: number;
    useInlineReplies = true;
    hidden = false;
    
    sharedComment: ChatMessage;

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

    private persistSettingsTimeout;
    persistSettings() {
        this.persistSettingsTimeout = setTimeout(() => {
            let qp = new URLSearchParams({
                topic: this.topicID,
                maxVisibleMessages: String(this.maxVisibleMessages),
                maxMessages: String(this.maxMessages)
            });

            if (this.jumpedCommentId)
                qp.set('comment', this.jumpedCommentId);

            window.location.replace(`/try?${qp.toString()}`);
        }, 100);
    }
    async ngOnInit() {
        this.route.queryParams.subscribe(async qp => {
            this.allowChangingTopic = true;
            this.topicID = qp.topic ?? 'home';
            this.maxVisibleMessages = qp.maxVisibleMessages ?? 200;
            this.maxMessages = qp.maxMessages ?? 2000;
            this.jumpedCommentId = qp.comment;

            this.newTopicID = this.topicID;
            
            this.messageCount = await this.chatBackend.getSourceCountForTopic(this.topicID);
            console.log(this.messageCount);
        });
    }

    changeTopic() {
        this.topicID = this.newTopicID;
    }

    @ViewChild('selectorPanelTemplate') selectorPanelTemplate: TemplatePortal<any>;

    sharedMessage(message: ChatMessage) {
        let comment = this.comments.getCommentComponentForMessage(message);

        if (comment) {
            let overlayRef = this.overlay.create({
                positionStrategy: this.overlay.position()
                    .flexibleConnectedTo(comment.element)
                    .withPositions([
                        {
                            originX: 'end',
                            originY: 'bottom',
                            overlayX: 'end',
                            overlayY: 'top'
                        }
                    ])
                    .withFlexibleDimensions(true),
                hasBackdrop: true,
                disposeOnNavigation: true,
                scrollStrategy: this.overlay.scrollStrategies.reposition({
                    autoClose: true
                })
            });
            
            overlayRef.backdropClick().subscribe(() => {
                overlayRef.detach();
            })

            overlayRef.keydownEvents().subscribe(event => {
                if (event.key === 'Escape') {
                    overlayRef.detach();
                }
            });

            this.sharedComment = message;
            overlayRef.attach(this.selectorPanelTemplate);
        } else {
            this.alert(`messsage id: ${message.id} has been shared, but we couldnt find its element`)
        }
    }

    reportedMessage(message: ChatMessage) {
        alert(`Message ${message.id} was reported`);
    }

    permissionDenied(message: string) {
        alert(`App should handle: '${message}'`);
    }

    dumpComponent() {
        console.dir(this.comments);
        window['bantaCommentsComponent'] = this.comments;
        alert(`Component has been dumped to console and placed into window.bantaCommentsComponent`);
    }

    becomeBob() {
        (window as any).becomeBob();
    }

    becomeAlice() {
        (window as any).becomeAlice();
    }
}
