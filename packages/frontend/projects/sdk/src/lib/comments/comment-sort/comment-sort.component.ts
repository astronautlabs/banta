import {Component, Input, Output} from '@angular/core';
import {ChatSource} from "@banta/common";
import {Subject} from "rxjs";

export enum CommentsOrder {
  NEWEST= 'newest',
  OLDEST= 'oldest',
  LIKES= 'likes',
}

@Component({
  selector: 'banta-comment-sort',
  templateUrl: './comment-sort.component.html',
  styleUrls: ['./comment-sort.component.css']
})
export class CommentSortComponent {

  defaultOrder = CommentsOrder.LIKES;
  commentsOrder = CommentsOrder;
  private _sort = new Subject<void>();

  @Input() source: ChatSource;

  @Output()
  get sortChange() {
    return this._sort.asObservable();
  }

  constructor() { }

}
