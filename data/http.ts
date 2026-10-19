/**
 * Data: Http — the one place the app makes HTTP requests.
 * Both book sources go through it, and tests replace it with canned answers.
 * Every failure (offline, timeout, error status, unreadable JSON) comes out as
 * BookSourceUnavailableError, so callers handle one error type.
 */
import { BookSourceUnavailableError } from "../service/ports";

export type Json = Record<string, unknown>;

/** Fetches a URL and returns its JSON body. Book sources take one of these. */
export type JsonGetter = (url: string) => Promise<Json>;

/** Fetches a URL and returns only its Content-Type (to tell a real cover from a placeholder). */
export type ContentTypeGetter = (url: string) => Promise<string>;

// Open Library asks clients to identify themselves; Google ignores the header.
const HEADERS = { "User-Agent": "MyHomeLib/1.0 (CEN 5064 student project)" };

// Open Library can take ~20 s when busy; past this the scan reports a failure instead of hanging.
const TIMEOUT_MS = 15_000;

export class Http {
  static async getJson(url: string): Promise<Json> {
    const response = await Http.get(url);
    try {
      const body: unknown = await response.json();
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("not a JSON object");
      }
      return body as Json;
    } catch (error) {
      throw new BookSourceUnavailableError(`Unreadable JSON from ${Http.host(url)}: ${String(error)}`);
    }
  }

  // Throws in a web browser when the server doesn't allow cross-site reads (no CORS headers).
  static async contentType(url: string): Promise<string> {
    const response = await Http.get(url);
    return response.headers.get("content-type") ?? "";
  }

  private static async get(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    } catch (error) {
      const reason = controller.signal.aborted ? `timed out after ${TIMEOUT_MS} ms` : String(error);
      throw new BookSourceUnavailableError(`${Http.host(url)} ${reason}`);
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      // 404 included: a source with no record answers 404, which callers treat as "not found here".
      throw new BookSourceUnavailableError(`HTTP ${response.status} from ${Http.host(url)}`);
    }
    return response;
  }

  // The host only, so an API key in the query string never reaches an error message.
  private static host(url: string): string {
    return url.replace(/^https?:\/\//, "").split(/[/?]/)[0];
  }
}
