/**
 * Data: Http — the one place the app makes HTTP requests.
 * Both book sources go through it, and tests replace it with canned answers.
 */
export type Json = Record<string, unknown>;

/** Fetches a URL and returns its JSON body. Book sources take one of these. */
export type JsonGetter = (url: string) => Promise<Json>;

/** Fetches a URL and returns only its Content-Type (to tell a real cover from a placeholder). */
export type ContentTypeGetter = (url: string) => Promise<string>;

// Open Library asks clients to identify themselves; Google ignores the header.
const HEADERS = { "User-Agent": "MyHomeLib/1.0 (CEN 5064 student project)" };

export class Http {
  static async getJson(url: string): Promise<Json> {
    const response = await Http.get(url);
    return response.json() as Promise<Json>;
  }

  // Throws in a web browser when the server doesn't allow cross-site reads (no CORS headers).
  static async contentType(url: string): Promise<string> {
    const response = await Http.get(url);
    return response.headers.get("content-type") ?? "";
  }

  private static async get(url: string): Promise<Response> {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response;
  }
}
