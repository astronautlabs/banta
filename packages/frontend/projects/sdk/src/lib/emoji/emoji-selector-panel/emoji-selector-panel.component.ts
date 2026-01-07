import { Component, inject, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { BANTA_SDK_OPTIONS } from '../../sdk-options';
import { EmojiDecorator, EMOJI, EmojiCategory, Emoji } from '@astronautlabs/emoji';

const CATEGORY_ICONS = {
    symbols: 'warning',
    people: 'people',
    nature: 'nature',
    travel: 'location_on',
    activity: 'local_activity',
    food: 'restaurant',
    objects: 'computer',
    flags: 'flag'
};

export interface AugmentedCategory extends EmojiCategory {
    icon: string,
    items: AugmentedEmoji[];
}

export interface AugmentedEmoji extends Emoji {
    html: SafeHtml;
}

@Component({
    selector: 'emoji-selector-panel',
    templateUrl: './emoji-selector-panel.component.html',
    styleUrls: ['./emoji-selector-panel.component.scss']
})
export class EmojiSelectorPanelComponent implements OnInit {

    private sanitizer = inject(DomSanitizer);
    private sdkOptions = inject(BANTA_SDK_OPTIONS, { optional: true });

    categories: AugmentedCategory[] = [];
    allEmoji: AugmentedEmoji[];
    activeCategory: string = 'people';
    searchResults: any[] = [];
    searchVisible = false;

    @Output()
    private selected: Subject<string> = new Subject();

    private _searchQuery: string;

    get searchQuery() {
        return this._searchQuery;
    }

    set searchQuery(value) {
        this._searchQuery = value;
        setTimeout(() => {
            this.searchResults = this.allEmoji
                .filter(k =>
                    k.description?.includes(value)
                    || k.shortcut?.includes(value)
                    || k.keywords?.some(x => x.includes(value))
                )
            ;
            this.searchResults.splice(50, this.searchResults.length);
        });
    }

    humanize(str: string) {
        if (!str)
            return undefined;
        return str.replace(/(^| )[a-z]/g, k => k.toUpperCase()).replace(/_/g, ' ');
    }

    select(char: string) {
        this.selected.next(char);
    }

    hideSearch() {
        // because of the "outside click detection"
        setTimeout(() => {
            this.searchVisible = false;
        });
    }

    showSearch() {
        // because of the "outside click detection"
        setTimeout(() => {
            this.searchVisible = true;
        });
    }

    private get emojiUrl() {
        return this.sdkOptions?.emojiUrl ?? 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/';
    }

    ngOnInit() {
        for (let category of EMOJI.categories) {
            if (!CATEGORY_ICONS[category.id])
                console.error(`Missing icon for category '${category.id}'`);
            this.categories.push({
                ...category,
                icon: CATEGORY_ICONS[category.id] ?? 'code',
                items: category.items.map(emoji => ({
                    ...emoji,
                    html: this.sanitizer.bypassSecurityTrustHtml(
                        EmojiDecorator.parse(emoji.string, { baseUrl: this.emojiUrl })
                    )
                }))
            });
        }

        this.allEmoji = this.categories.flatMap(cat => cat.items);

    }

}
