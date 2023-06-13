import { Injectable } from "@banta/common";

interface TimerState {
    handle?;
    subscribers: (() => void)[];
}

/**
 * Provides a way to hook in to a shared set of timers, instead of creating a timer per instance.
 * This is very useful for cases where the update is not extremely time-sensitive, but happens at scale.
 * The principal use case is the TimestampComponent. When several hundred (or several thousand) comments are 
 * being displayed, we do not want to trigger thousands of independent relative timestamp updates, because over 
 * time the updates will saturate the CPU since they don't perfectly align. 
 */
@Injectable()
export class TimerPool {
    private subscriptions = new Map<number, TimerState>();

    addTimer(interval: number, callback: () => void) {
        if (interval <= 0) {
            console.warn(`Refusing to set timer with interval of ${interval}!`);
            return () => {};
        }

        let state: TimerState;

        if (!this.subscriptions.has(interval)) {
            state = { subscribers: [] };
            state.handle = setInterval(() => state.subscribers.forEach(sub => sub()), interval);
            this.subscriptions.set(interval, state);
        } else {
            state = this.subscriptions.get(interval);
        }

        state.subscribers.push(callback);

        return () => {
            let state = this.subscriptions.get(interval);
            let index = state.subscribers.findIndex(callback);
            if (index >= 0)
                state.subscribers.splice(index, 1);

            if (state.subscribers.length === 0) {
                clearInterval(state.handle);
                this.subscriptions.delete(interval);
            }
        };
    }
}