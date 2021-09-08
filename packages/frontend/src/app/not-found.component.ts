import { Component } from '@angular/core';

@Component({
    template: `
        <div>
            <h1>404</h1>
            <h2>Not Found</h2>
            <p>Uh oh, the content you are looking for was not found.</p>
        </div>
    `,
    styles: [`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        div {
            text-align: center;
        }

        h1 {
            font-family: 'Odibee Sans', sans-serif;
            font-size: 72pt;
            font-weight: 100;
            letter-spacing: 20px;
            padding: 0;
            margin: 0;
            color: #333;
        }
        h2 {
            font-family: 'Odibee Sans', sans-serif;
            font-size: 30pt;
            font-weight: 100;
            letter-spacing: 10px;
            text-transform: lowercase;
            padding: 0;
            margin: 0;
        }

        p {
            color: #aaa;
        }
    `]
})
export class NotFoundComponent {
}