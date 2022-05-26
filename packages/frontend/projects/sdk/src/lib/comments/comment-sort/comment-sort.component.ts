import { Component, Input, Output } from '@angular/core';
import { CommentsOrder } from "@banta/common";
import { Subject } from "rxjs";

@Component({
  selector: 'banta-comment-sort',
  templateUrl: './comment-sort.component.html',
  styleUrls: ['./comment-sort.component.css']
})
export class CommentSortComponent {

  commentsOrder = CommentsOrder;
  private _sortChange = new Subject<CommentsOrder>();
  private _sort: CommentsOrder = CommentsOrder.LIKES;

  @Input() 
  get sort() { 
    return this._sort;
  }

  set sort(value) {
    if (this._sort !== value) {
      this._sort = value;
      setTimeout(() => this._sortChange.next(value));
    }
  }

  @Output()
  get sortChange() {
    return this._sortChange.asObservable();
  }
}
