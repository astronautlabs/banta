import { Component, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
		private sanitizer : DomSanitizer
	) { }

	categories : any[];
	activeCategory : string = 'people';

	@Output()
	private selected : Subject<string> = new Subject();

	select(char : string) {
		this.selected.next(char);
	}

	pairs(object) {
		return Object.keys(object).map(key => [key, object[key]]);
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

			emoji.html = this.sanitizer.bypassSecurityTrustHtml(twemoji.parse(emoji.char || ''));

			cats[emoji.category].emojis.push(emoji);
		}

		this.categories = this.pairs(cats).map(pair => pair[1]);
	}

}
