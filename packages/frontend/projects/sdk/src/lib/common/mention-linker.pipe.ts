import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ChatMessageMention } from '@banta/common';

@Pipe({
    name: 'mentionLinker'
})
export class BantaMentionLinkerPipe implements PipeTransform {
    transform(value: string, links?: ChatMessageMention[]) {
        if (!value)
            return '';

        if (!links)
            return value;

        let text = value;

        for (let i = 0, max = links.length; i < max; ++i) {
            let mention = links[i];
            text = text.replace(new RegExp(`${this.escapeRegExp(mention.text)}`, `gi`), `@{${i + 1}}`);
        }

        text = text.replace(/@\{(\d+)\}/g, (text, i) => links[i - 1] ? this.formatLink(links[i - 1]) : text);

        return text;
    }

    formatLink(link: ChatMessageMention) {
        return `<a${ link.external ? ` target="_blank" rel="noopener"` : `` } class="mention" href="${link.link}">${link.text}</a>`;
    }

    /**
     * https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
}