/**
 * Device: PhoneDevices — the device family on a phone (Abstract Factory): the
 * real camera and haptic feedback.
 */
import { CoverCamera } from "../model/coverCamera";
import { DeviceFamily, Feedback } from "../model/devices";
import { ExpoCoverCamera } from "./expoCoverCamera";
import { HapticFeedback } from "./hapticFeedback";

export class PhoneDevices implements DeviceFamily {
  createCoverCamera(): CoverCamera {
    return new ExpoCoverCamera();
  }

  createFeedback(): Feedback {
    return new HapticFeedback();
  }
}
