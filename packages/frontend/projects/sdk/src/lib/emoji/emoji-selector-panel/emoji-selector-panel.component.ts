declare var twemoji: {
    parse(str: string, options?: { folder?: string, ext?: string, base?: string }): string;
}

import { Component, Inject, Input, OnInit, Optional, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BANTA_SDK_OPTIONS, SdkOptions } from '../../sdk-options';
import { Subject } from 'rxjs';

interface Emoji {
	keywords : string[];
	char : string;
	html? : SafeHtml;
	category : string;
}

import { EMOJIS } from '../emojis';

@Component({
	selector: 'emoji-selector-panel',
	templateUrl: './emoji-selector-panel.component.html',
	styleUrls: ['./emoji-selector-panel.component.scss']
})
export class EmojiSelectorPanelComponent implements OnInit {

	constructor(
		private sanitizer : DomSanitizer,
		@Inject(BANTA_SDK_OPTIONS) @Optional()
		private sdkOptions: SdkOptions
	) { }

	categories : any[];
	activeCategory : string = 'people';
	searchResults : any[] = [];
    searchVisible = false;
	
	@Output()
	private selected : Subject<string> = new Subject();

	private _searchQuery : string;

	get searchQuery() {
		return this._searchQuery;
	}

	set searchQuery(value) {
		this._searchQuery = value;
		setTimeout(() => {
			this.searchResults = Object.keys(EMOJIS).filter(k => k.includes(value)).map(k => EMOJIS[k]);
			this.searchResults.splice(50, this.searchResults.length);
			console.log(`looking for '${value}' => ${this.searchResults.length} results`);
		});
	}

	humanize(str : string) {
		return str.replace(/(^| )[a-z]/g, k => k.toUpperCase()).replace(/_/g, ' ');
	}

	select(char : string) {
		this.selected.next(char);
	}

	pairs(object) {
		return Object.keys(object).map(key => [key, object[key]]);
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
		return this.sdkOptions?.emojiUrl ?? 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/';
	}

	ngOnInit() {

		let cats = {};
		let categoryIcons = {
			symbols: 'warning',
			people: 'people',
			animals_and_nature: 'nature',
			travel_and_places: 'location_on',
			activity: 'local_activity',
			food_and_drink: 'restaurant',
			objects: 'computer',
			flags: 'flag'
		};
		for (let pair of this.pairs(EMOJIS)) {
			let name = pair[0];
			let emoji : Emoji = pair[1];

			if (!cats[emoji.category]) {
				cats[emoji.category] = {
					name: emoji.category,
					icon: categoryIcons[emoji.category] || 'code',
					emojis: []
				}
			}

			emoji.html = this.sanitizer.bypassSecurityTrustHtml(
				twemoji.parse(emoji.char || '', { base: this.emojiUrl })
			);

			cats[emoji.category].emojis.push(emoji);
		}

		this.categories = this.pairs(cats).map(pair => pair[1]);
	}

}
