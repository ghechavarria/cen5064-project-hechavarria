/**
 * Presentation model: CoverCamera — what the view model needs to photograph a
 * book cover. An interface, so the model never touches the device directly:
 * the device family (see devices.ts) supplies it, and tests pass a fake.
 */
export interface CoverCamera {
  // False where there is no camera (the browser build): the screens offer typing instead.
  readonly available: boolean;
  // A small image of the cover (data URI), or null if the owner backed out.
  takePhoto(): Promise<string | null>;
}

/** The camera can't be used (permission refused, or no camera). */
export class CameraUnavailableError extends Error {}
