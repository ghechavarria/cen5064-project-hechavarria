/**
 * Device: BrowserDevices — the device family in a web browser (Abstract
 * Factory). The browser build has no camera and no vibration motor, so its
 * camera refuses with a pointer to the phone app and its feedback is silent.
 * No Expo device module is loaded here.
 */
import { CameraUnavailableError, CoverCamera } from "../model/coverCamera";
import { DeviceFamily, Feedback } from "../model/devices";
import { Labels } from "../model/labels";

/** No camera: a cover photo needs the phone app. */
class BrowserCoverCamera implements CoverCamera {
  readonly available = false;

  async takePhoto(): Promise<string | null> {
    throw new CameraUnavailableError(Labels.mobileCameraOnly);
  }
}

/** No vibration motor: feedback does nothing. */
class SilentFeedback implements Feedback {
  selection(): void {}

  message(): void {}
}

export class BrowserDevices implements DeviceFamily {
  createCoverCamera(): CoverCamera {
    return new BrowserCoverCamera();
  }

  createFeedback(): Feedback {
    return new SilentFeedback();
  }
}
