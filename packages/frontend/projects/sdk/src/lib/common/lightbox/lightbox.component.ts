import { Component, ElementRef, ViewChild } from "@angular/core";

@Component({
    selector: 'banta-lightbox',
    templateUrl: './lightbox.component.html',
    styleUrls: ['./lightbox.component.scss']
})
export class LightboxComponent {
    @ViewChild('container') 
    containerElement: ElementRef<HTMLDivElement>;

    ngAfterViewInit() {
        document.body.appendChild(this.containerElement.nativeElement);
    }

    ngOnDestroy() {
        this.containerElement.nativeElement.remove();
    }

    images: string[];
    currentImage: string;

    isOpen: boolean;

    close() {
        this.isOpen = false;
    }

    open(currentImage: string, images: string[]) {
        this.currentImage = currentImage;
        this.images = images;
        this.isOpen = true;
    }
}