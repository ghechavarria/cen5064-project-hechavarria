/**
 * Presentation model: the device services the view model needs, created as one
 * matched family (Abstract Factory). A phone gets the real camera and haptics;
 * the browser build gets a camera that explains itself and silent feedback.
 * App.tsx picks the family once, so a phone service and a browser one can
 * never be mixed. Tests pass a fake family.
 */
import { CoverCamera } from "./coverCamera";

/** The physical response to a choice or a message (haptics on a phone). */
export interface Feedback {
  // A tab or a switch changed.
  selection(): void;
  // A banner appeared; failed means it reports an error.
  message(failed: boolean): void;
}

/** Abstract factory: creates the device services that belong together. */
export interface DeviceFamily {
  createCoverCamera(): CoverCamera;
  createFeedback(): Feedback;
}
