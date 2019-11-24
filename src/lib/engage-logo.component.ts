import { Component } from "@angular/core";

@Component({
    selector: 'engage-logo',
    template: `engage`,
    styles: [
        `
        :host {
            font-family: 'Odibee Sans', sans-serif;
            font-size: 40pt;
        }

        :host.small {
            font-size: 30pt;
        }
        `
    ]
})
export class EngageLogoComponent {

}