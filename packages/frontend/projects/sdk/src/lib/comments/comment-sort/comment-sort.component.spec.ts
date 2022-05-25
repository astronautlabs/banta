import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommentSortComponent } from './comment-sort.component';

describe('CommentSortComponent', () => {
  let component: CommentSortComponent;
  let fixture: ComponentFixture<CommentSortComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommentSortComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentSortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
