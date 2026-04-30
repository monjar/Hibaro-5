import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<MessageEvent>();

  stream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  publish<TPayload>(type: string, payload: TPayload) {
    this.events$.next({
      type,
      data: {
        type,
        sentAt: new Date().toISOString(),
        payload,
      },
    });
  }
}