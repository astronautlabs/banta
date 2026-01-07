import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'trustResourceUrl',
    standalone: false
})
export class BantaTrustResourceUrlPipe implements PipeTransform {
    constructor(
        private sanitizer: DomSanitizer
    ) {
    }

    transform(value: string) {
        if (!value)
            return undefined;

        return this.sanitizer.bypassSecurityTrustResourceUrl(value);
    }
}