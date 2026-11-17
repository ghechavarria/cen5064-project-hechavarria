/**
 * Data: LiveChanges — keeps a Realtime watch alive (auto sync, ADR-012/ADR-013).
 *
 * A Realtime channel can fail without the app noticing: the phone sleeps or
 * changes network and the socket drops, or the channel joins before the
 * sign-in token is ready and the database refuses its filter. Any change made
 * meanwhile was never announced, so it only arrived with the next Sync now.
 *
 * LiveChanges opens the channel through `open`, reopens it after a failure
 * (waiting 2 s, doubling up to 1 min), and every time the channel is live
 * again it reports a change, so the caller syncs and catches up on whatever it
 * missed. With incremental sync that catch-up downloads only what changed.
 */

/** What an open channel reports back. */
export type ChannelEvents = {
  changed(): void; // a row of this account changed
  live(): void; // the database confirmed the subscription: changes will now arrive
  broken(): void; // the channel failed or was refused
};

/** Opens one channel that reports through `events`; returns a function that closes it. */
export type OpenChannel = (events: ChannelEvents) => () => void;

const FIRST_RETRY_MS = 2_000;
const LAST_RETRY_MS = 60_000;

export class LiveChanges {
  private close: (() => void) | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private wait = FIRST_RETRY_MS;
  private stopped = false;

  private constructor(
    private readonly open: OpenChannel,
    private readonly onChange: () => void,
  ) {}

  /** Starts watching; returns a function that stops for good. */
  static watch(open: OpenChannel, onChange: () => void): () => void {
    const watch = new LiveChanges(open, onChange);
    watch.connect();
    return () => watch.stop();
  }

  private connect(): void {
    // Each channel reports only while it is the current one, so a late message
    // from a closed channel can't start a second retry.
    let current = true;
    const closeChannel = this.open({
      changed: () => current && this.onChange(),
      live: () => {
        if (current) {
          this.wait = FIRST_RETRY_MS;
          this.onChange(); // catch up on anything missed while not live
        }
      },
      broken: () => current && this.reconnectLater(),
    });
    this.close = () => {
      current = false;
      closeChannel();
    };
  }

  private reconnectLater(): void {
    if (this.stopped || this.retry) {
      return;
    }
    this.close?.();
    this.close = null;
    this.retry = setTimeout(() => {
      this.retry = null;
      this.connect();
    }, this.wait);
    this.wait = Math.min(this.wait * 2, LAST_RETRY_MS);
  }

  private stop(): void {
    this.stopped = true;
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
    this.close?.();
    this.close = null;
  }
}
