import { SafeHtml } from '@angular/platform-browser';

export interface Sku {
    id : string;
    rank : number;
    name : string;
    showInMatrix : boolean;
    summary : string | SafeHtml;
    description? : string | SafeHtml;
    iconUrl? : string;
    iconName? : string;
    priceOptions? : string[];
    support? : string;
}

export interface Feature {
    id : string;
    name : string;
    summary : string | SafeHtml;
    description? : string | SafeHtml;
    skus? : string[];
    skuContent? : Record<string,string>;
    iconUrl? : string;
    iconName? : string;
    finePrint? : string;
}