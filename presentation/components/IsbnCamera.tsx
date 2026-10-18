/**
 * Component: IsbnCamera — reads ISBN barcodes with the phone camera and hands
 * each new code to onIsbn. It never saves and never fetches. In a web browser
 * it explains that the camera needs the phone app.
 */
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Platform, Text, View } from "react-native";
import { Labels } from "../model/labels";
import { styles } from "../styles/isbnCamera.styles";
import { icon, theme } from "../styles/theme";
import { Button } from "./Button";

export function IsbnCamera(props: { listening: boolean; onIsbn: (isbn: string) => void }) {
  return Platform.OS === "web" ? <MobileAppOnly /> : <PhoneCamera {...props} />;
}

// Web: no camera, so point to the phone app and to the typed ISBN below.
function MobileAppOnly() {
  return (
    <View style={styles.frame}>
      <Ionicons name="phone-portrait-outline" size={icon.hero} color={theme.glow} />
      <Text style={styles.title}>Scanning needs the mobile app</Text>
      <Text style={styles.muted}>{Labels.mobileCameraOnly} On the web, type the ISBN below.</Text>
    </View>
  );
}

// The four brackets that frame the barcode target.
const CORNERS = ["cornerTL", "cornerTR", "cornerBL", "cornerBR"] as const;

// Book barcodes: ISBN-13 is EAN-13; the others cover older and US prints.
const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

function PhoneCamera({ listening, onIsbn }: { listening: boolean; onIsbn: (isbn: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastCode = useRef("");

  // 1. Still asking the OS whether we may use the camera.
  if (!permission) {
    return (
      <View style={styles.frame}>
        <Text style={styles.muted}>Checking camera…</Text>
      </View>
    );
  }

  // 2. Not allowed yet: explain and offer the permission prompt.
  if (!permission.granted) {
    return (
      <View style={styles.frame}>
        <Ionicons name="camera-outline" size={icon.hero} color={theme.glow} />
        <Text style={styles.title}>Use the camera to scan a book</Text>
        <Text style={styles.muted}>Nothing is recorded.</Text>
        <Button label="Allow camera" compact onPress={() => void requestPermission()} />
      </View>
    );
  }

  // 3. Live preview. The same code is never reported twice in a row.
  return (
    <View collapsable={false} style={styles.preview}>
      <CameraView
        facing="back"
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={
          listening
            ? ({ data }) => {
                if (data !== lastCode.current) {
                  lastCode.current = data;
                  onIsbn(data);
                }
              }
            : undefined
        }
      />
      <View style={styles.reticle} pointerEvents="none">
        {CORNERS.map((corner) => (
          <View key={corner} style={[styles.corner, styles[corner]]} />
        ))}
      </View>
      <Text style={styles.hint}>Align the barcode in the box</Text>
    </View>
  );
}
