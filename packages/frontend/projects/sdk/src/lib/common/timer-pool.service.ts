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

    private newSubscriptionsNotice;
    private newSubscriptions = new Map<number, number>();

    private removedSubscriptionsNotice;
    private removedSubscriptions = new Map<number, number>();

    addTimer(interval: number, callback: () => void) {
        if (interval <= 0) {
            console.warn(`Refusing to set timer with interval of ${interval}!`);
            return () => {};
        }

        let state: TimerState;
        let sizeWas = this.subscriptions.size;

        if (!this.subscriptions.has(interval)) {
            state = { subscribers: [] };
            state.handle = setInterval(() => {
                console.debug(`[Banta/TimerPool] Notifying ${state.subscribers.length} subs [${interval}ms]`);
                state.subscribers.forEach(sub => sub());
            }, interval);
            this.subscriptions.set(interval, state);
        } else {
            state = this.subscriptions.get(interval);
        }

        state.subscribers.push(callback);

        // Debug information //////////////////////////
        //

        if (!this.newSubscriptions.has(interval))
            this.newSubscriptions.set(interval, 0);
        this.newSubscriptions.set(interval, (this.newSubscriptions.get(interval) ?? 0) + 1);

        clearTimeout(this.newSubscriptionsNotice);
        this.newSubscriptionsNotice = setTimeout(() => {
            for (let [interval, count] of this.newSubscriptions) {
                console.debug(`[Banta/TimerPool] ${count} new subscriptions to ${interval}ms [${state.subscribers.length} total]`);
            }

            this.newSubscriptions.clear();
        });

        //
        ///////////////////////////////////////////////

        if (sizeWas === 0) {
            console.debug(`[Banta/TimerPool] No longer idle.`);
        }

        // Unsubscribe function 

        return () => {
            let state = this.subscriptions.get(interval);
            let index = state.subscribers.indexOf(callback);
            if (index >= 0)
                state.subscribers.splice(index, 1);

            if (state.subscribers.length === 0) {
                clearInterval(state.handle);
                this.subscriptions.delete(interval);
            }

            if (!this.removedSubscriptions.has(interval))
                this.removedSubscriptions.set(interval, 0);
            this.removedSubscriptions.set(interval, (this.removedSubscriptions.get(interval) ?? 0) + 1);

            // Debug information ////////////////////////////////////////////////////////////////////

            clearTimeout(this.removedSubscriptionsNotice);
            this.removedSubscriptionsNotice = setTimeout(() => {
                for (let [interval, count] of this.removedSubscriptions) {
                    let state = this.subscriptions.get(interval);
                    console.debug(`[Banta/TimerPool] ${count} unsubscribed from ${interval}ms [${state?.subscribers?.length ?? 0} remain]`);
                }

                if (this.subscriptions.size === 0)
                    console.debug(`[Banta/TimerPool] All subscriptions have been removed. Now idle.`);

                this.removedSubscriptions.clear();
            });
        };
    }
}