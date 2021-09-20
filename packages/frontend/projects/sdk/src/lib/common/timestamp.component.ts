import { Component, Input } from "@angular/core";

@Component({
    selector: 'banta-timestamp',
    template: `
        <span *ngIf="showAbsolute" [title]="value | date : 'short'">
            {{value | date : 'shortDate'}}
        </span>
        <span *ngIf="!showAbsolute" [title]="value | date : 'short'">
            {{relative}}
        </span>
    `,
    styles: [``]
})
export class TimestampComponent {
    private _value : number;
    relative = '';
    tooltip = '';

    private updateInterval = null;

    ngOnDestroy() {
        if (this.updateInterval)
            clearInterval(this.updateInterval);
    }

    @Input()
    get value() {
        return this._value;
    }

    showAbsolute = false;

    update() {
        
        let now = Date.now();
        let diff = now - this.value;
        let minute = 1000*60;
        let hour = minute * 60;
        let day = hour * 24;
        let week = day * 7;
        let month = day * 30;
        let year = day * 365;
        this.showAbsolute = false;
        let updateTime = 0;

        if (diff > year) {
            this.showAbsolute = true;
            this.relative = 'abs';
            return;
        }

        if (diff > month) {
            let months = Math.floor(diff / month);

            if (months === 1)
                this.relative = `${months} month ago`;
            else
                this.relative = `${months} months ago`;
            
        } else if (diff > week) {
            let weeks = Math.floor(diff / week);

            if (weeks === 1)
                this.relative = `${weeks} week ago`;
            else
                this.relative = `${weeks} weeks ago`;
        } else if (diff > day) {
            let days = Math.floor(diff / day);
            if (days === 1)
                this.relative = `${days} day ago`;
            else
                this.relative = `${days} days ago`;
        } else if (diff > hour) {
            let hours = Math.floor(diff / hour);
            if (hours === 1)
                this.relative = `${hours} hour ago`;
            else
                this.relative = `${hours} hours ago`;
            
            updateTime = 1000 * 60 * 30;
        } else if (diff > minute) {
            let minutes = Math.floor(diff / minute);
            if (minutes === 1)
                this.relative = `${minutes} minute ago`;
            else
                this.relative = `${minutes} minutes ago`;
            updateTime = 1000 * 45;
        } else if (diff > 30_000) {
            this.relative = `about a minute ago`;
            updateTime = 1000 * 60;
        } else {
            this.relative = `just now`;
            updateTime = 1000 * 30;
        }
        
        if (typeof window !== 'undefined') {
            clearInterval(this.updateInterval);
            if (updateTime > 0) {
                this.updateInterval = setInterval(() => this.update());
            }
        }
    }

    set value(v) {
        this._value = v;
        this.update();
    }
}