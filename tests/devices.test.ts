/**
 * Tests: the device family (Abstract Factory). The view model gets its camera
 * and its feedback from ONE family, so they always belong to the same platform:
 * the browser family as a whole, feedback that now flows through the family
 * (it used to be static calls in three components), and the model asking the
 * family whether there is a camera instead of checking the platform itself.
 * PhoneDevices is not loaded here: its products need the phone's Expo modules.
 */
import { BrowserDevices } from "../presentation/device/browserDevices";
import { CameraUnavailableError, CoverCamera } from "../presentation/model/coverCamera";
import { DeviceFamily, Feedback } from "../presentation/model/devices";
import { Labels } from "../presentation/model/labels";
import { LibraryAppModel } from "../presentation/model/libraryAppModel";
import { ReadingStatus } from "../domain";
import { FOX, FakeDevices, controllerFor } from "./fixtures";

const models: LibraryAppModel[] = [];
async function modelWith(devices: DeviceFamily): Promise<LibraryAppModel> {
  const model = new LibraryAppModel(async () => controllerFor(), devices);
  models.push(model);
  await model.start();
  return model;
}
afterEach(() => models.splice(0).forEach((model) => model.dispose()));

test("the browser family: no camera, a photo points to the phone app, and feedback is silent", async () => {
  const family = new BrowserDevices();
  const camera = family.createCoverCamera();
  expect(camera.available).toBe(false);
  await expect(camera.takePhoto()).rejects.toThrow(new CameraUnavailableError(Labels.mobileCameraOnly));
  const feedback = family.createFeedback();
  expect(() => {
    feedback.selection();
    feedback.message(true);
  }).not.toThrow();
});

test("the model takes BOTH services from the one family it is given", async () => {
  const created: string[] = [];
  const family: DeviceFamily = {
    createCoverCamera: (): CoverCamera => (created.push("camera"), { available: true, takePhoto: async () => null }),
    createFeedback: (): Feedback => (created.push("feedback"), { selection: () => {}, message: () => {} }),
  };
  await modelWith(family);
  expect(created.sort()).toEqual(["camera", "feedback"]);
});

test("feedback flows through the family: a tick when a tab or switch changes, not when it stays", async () => {
  const devices = new FakeDevices();
  const model = await modelWith(devices);
  model.selectTab("owned");
  model.selectTab("owned"); // tapped again: no tick
  model.showReading(ReadingStatus.READ);
  model.setCatalogMode("az"); // already A–Z: no tick
  model.setCatalogMode("series");
  expect(devices.feedback.events).toEqual(["selection", "selection", "selection"]);
});

test("feedback flows through the family: a tap for a notice, a buzz for an error", async () => {
  const devices = new FakeDevices({
    available: true,
    takePhoto: async () => {
      throw new CameraUnavailableError("Allow camera access to photograph your cover.");
    },
  });
  const model = await modelWith(devices);
  await model.scan(FOX.isbn);
  await model.photographScanCover(); // refused camera: error banner
  model.cancelPrompt(); // "Nothing added.": a normal notice
  expect(devices.feedback.events).toEqual(["error", "message"]);
});

test("with the browser family the model reports no camera, and a cover photo explains why", async () => {
  const model = await modelWith(new BrowserDevices());
  expect(model.cameraAvailable).toBe(false);
  await model.scan(FOX.isbn);
  await model.photographScanCover();
  expect(model.getState().flash).toEqual({ text: Labels.mobileCameraOnly, tone: "danger" });
});
