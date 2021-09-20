import { DemoService, Demo } from './demo.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Component } from '@angular/core';

@Component({
    template: `

        <banta [topicID]="demo.roomId"></banta>

        <div class="demo-bar">
            <div>
                <banta-logo></banta-logo>
                <ng-container *ngIf="demo.name">
                    {{demo.name}}
                </ng-container>
                <ng-container *ngIf="!demo.name">
                    Demo
                </ng-container>
            </div>
            <div class="spacer"></div>
            <div>
                Prepared for 
                
                <ng-container *ngIf="demo.contact">
                    {{demo.contact.name}}, 
                </ng-container>
                
                <ng-container *ngIf="demo.organization">
                    {{demo.organization.name}}
                </ng-container>

                &nbsp;
                
                <a routerLink="/features">Learn more</a>
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: flex;
                flex-direction: column;
                font-weight: 100;
                color: #666;
            }

            banta {
                flex-grow: 1;
            }
            .demo-bar {
                display: flex;
                flex-direction: row;
                padding: 1em;
                align-items: flex-end;
            }

            .demo-bar > * {
                display: flex;
                align-items: flex-end;
            }

            .demo-bar banta-logo {
                position: relative;
                top: 10px;
            }
        `
    ]
})
export class DemoComponent {
    constructor(
        private demoService : DemoService,
        private route : ActivatedRoute,
        private router : Router
    ) {
    }

    ngOnInit() {
        this.route.paramMap.subscribe(async params => {
            let name = params.get('name');
            let demo = await this.demoService.get(name);

            if (!demo) {
                this.router.navigateByUrl('/');
            }

            this.demo = demo;
        });
    }

    demo : Demo;
}