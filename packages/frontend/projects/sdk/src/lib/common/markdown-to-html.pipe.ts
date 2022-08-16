import { Pipe, PipeTransform } from '@angular/core';
import * as marked from 'marked';
import * as DOMPurify from 'dompurify';
import { DomSanitizer } from '@angular/platform-browser';

const underline = {
    name: 'underline',
    level: 'inline', // Is this a block-level or inline-level tokenizer?
    start(src) { return src.match(/\+\+/)?.index; }, // Hint to Marked.js to stop and check for a match
    tokenizer(src, tokens) {
        const rule = /^\+\+(.*?)\+\+/; // Regex for the complete token
        const match = rule.exec(src);
        if (match) {
            return { // Token to generate
                type: 'underline', // Should match "name" above
                raw: match[0], // Text to consume from the source
                text: this.lexer.inlineTokens(match[1].trim()), // Additional custom properties
            };
        }
    },
    renderer(token) {
        return `<u>${this.parser.parseInline(token.text)}</u>`;
    }
};

marked.marked.use({
    extensions: [underline]
});

@Pipe({
    name: 'markdownToHtml'
})
export class BantaMarkdownToHtmlPipe implements PipeTransform {
    constructor(
        private sanitizer: DomSanitizer
    ) {
        this.renderer = new marked.Renderer({
            headerPrefix: ''
        });
        const linkRenderer = this.renderer.link;
        this.renderer.link = (href, title, text) => {
            const html = linkRenderer.call(this.renderer, href, title, text);
            return html.replace(/^<a /, '<a target="_blank" rel="noopener" ');
        };
    }

    renderer: marked.Renderer;
    transform(value: string) {
        if (!value)
            return '';

        return this.sanitizer.bypassSecurityTrustHtml(
            DOMPurify.sanitize(
                marked.marked.parse(value, {
                    renderer: this.renderer
                }),
                {
                    FORBID_TAGS: ['h1', 'h2', 'h3', 'h4'],
                    KEEP_CONTENT: true
                }
            )
        );
    }
}