/**
 * Device: ExpoCoverCamera — CoverCamera on Expo. Opens the camera (a file /
 * webcam picker on Expo web), lets the owner crop to the cover, then shrinks
 * the photo to a small JPEG kept inline as a data URI, so it can be stored with
 * the book in SQLite or browser storage and never depends on a temporary file.
 */
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { CameraUnavailableError, CoverCamera } from "../model/coverCamera";

// Big enough for the detail screen, small enough (~20–40 KB) to store many.
const COVER_WIDTH = 360;
const JPEG_QUALITY = 0.6;

export class ExpoCoverCamera implements CoverCamera {
  async takePhoto(): Promise<string | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new CameraUnavailableError("Allow camera access to photograph your cover.");
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) {
      return null;
    }
    return ExpoCoverCamera.shrink(result.assets[0].uri);
  }

  private static async shrink(uri: string): Promise<string> {
    const image = await ImageManipulator.manipulate(uri).resize({ width: COVER_WIDTH }).renderAsync();
    const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
    return `data:image/jpeg;base64,${saved.base64}`;
  }
}
