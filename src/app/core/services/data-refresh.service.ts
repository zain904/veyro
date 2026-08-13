import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type DataRefreshReason = 'transaction' | 'budget' | 'category' | 'profile';

@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  private refreshSubject = new Subject<DataRefreshReason>();
  readonly refresh$ = this.refreshSubject.asObservable();

  notify(reason: DataRefreshReason): void {
    this.refreshSubject.next(reason);
  }
}
