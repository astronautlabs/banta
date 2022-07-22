import { Subject, Observable, ConnectableObservable } from 'rxjs';
import { publish } from 'rxjs/operators';

export interface LazyConnectionOptions<T> {
    start : (subject : Subject<T>) => void;
    stop : () => void;
    subject? : Subject<T>;
}

export function lazyConnection<T>(options : LazyConnectionOptions<T>): Observable<T> {

    let obs = new Observable(observer => {
        let subject = options.subject ?? new Subject<T>();
        let subscription = subject.subscribe(observer);

        options.start(subject);
        return () => {
            subscription.unsubscribe();
            options.stop();
        };
    });
    
    return (<ConnectableObservable<T>>obs.pipe(publish())).refCount();
}