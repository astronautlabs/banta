import { Component, ElementRef, OnInit, Output, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'comment-attachments',
  templateUrl: './attachment.component.html',
  styleUrls: ['./attachment.component.css']
})
export class AttachmentComponent {

  @ViewChild('fileUpload', {static: false}) fileInput: ElementRef;

  private _addAttachment = new Subject<File>();

  @Output()
  get addAttachment() {
    return this._addAttachment.asObservable();
  }
  
  show() {
    (this.fileInput.nativeElement as HTMLInputElement).click();
  }

  fileChange(event: Event): void {
      const element = (event.currentTarget as HTMLInputElement);
      if (element.files.length) {
        console.log('[Banta] File Added to comment');
        this._addAttachment.next(element.files[0]);
      }

  }

}
