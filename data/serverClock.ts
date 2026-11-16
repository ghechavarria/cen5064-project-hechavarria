/**
 * Data: ServerClock — the time this device stamps its changes with, corrected
 * to the server's clock (ADR-013).
 *
 * "Latest change wins" compares timestamps from different devices. A device
 * whose clock is wrong loses: a computer 46 s slow stamps a delete 46 s in the
 * past, so a save made on a phone just before it looks newer and the delete is
 * refused. Every Supabase answer carries a Date header with the server's time;
 * ServerClock learns the device's offset from it and adds it to every stamp.
 *
 * The header is in whole seconds, so the offset only changes when it is off by
 * more than 1.5 s (no jitter from a correct clock). Stamps never go backwards,
 * so two quick changes on one device keep their order even when the offset
 * changes between them. Until the first answer arrives (e.g. offline at
 * start-up), the device's own clock is used.
 */
import { Clock } from "./bookRepository";

const TOLERANCE_MS = 1_500;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "Mon, 16 Nov 2026 00:16:34 GMT" (the only form HTTP servers send today).
const HTTP_DATE = /^\w{3}, (\d{2}) (\w{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/;

export class ServerClock {
  private offset = 0;
  private last = 0;

  constructor(private readonly deviceClock: Clock = Date.now) {}

  /** The corrected time, in milliseconds since 1970; later than any stamp given before. */
  readonly now: Clock = () => {
    this.last = Math.max(this.deviceClock() + this.offset, this.last + 1);
    return this.last;
  };

  /** A server answered, with this Date header (or none), just now on the device clock. */
  heard(dateHeader: string | null): void {
    const server = ServerClock.parseHttpDate(dateHeader);
    if (server === null) {
      return;
    }
    // The server's time is somewhere in that second: take the middle.
    const estimate = server + 500 - this.deviceClock();
    if (Math.abs(estimate - this.offset) > TOLERANCE_MS) {
      this.offset = estimate;
    }
  }

  /** fetch, reporting each answer's Date header to the clock. */
  watching(fetcher: typeof fetch): typeof fetch {
    return async (input, init) => {
      const response = await fetcher(input, init);
      this.heard(response.headers.get("date"));
      return response;
    };
  }

  // Parsed by hand: Date.parse of this form isn't guaranteed on every JS engine.
  private static parseHttpDate(header: string | null): number | null {
    const match = header ? HTTP_DATE.exec(header.trim()) : null;
    const month = match ? MONTHS.indexOf(match[2]) : -1;
    if (!match || month < 0) {
      return null;
    }
    const [day, year, hours, minutes, seconds] = [match[1], match[3], match[4], match[5], match[6]].map(Number);
    return Date.UTC(year, month, day, hours, minutes, seconds);
  }
}
