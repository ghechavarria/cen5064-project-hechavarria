/**
 * Presentation: device camera / web webcam ISBN barcode. No save, no fetch.
 * Must not call fetch or SQL.
 */
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "./theme";

export function IsbnCamera({
  listening,
  onIsbn,
}: {
  listening: boolean;
  onIsbn: (isbn: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const last = useRef("");
  const [box, setBox] = useState({ width: 0, height: 280 });

  if (!permission) {
    return (
      <View style={styles.frame}>
        <Text style={styles.muted}>Checking camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.frame}>
        <Ionicons name="camera-outline" size={36} color={theme.gold} />
        <Text style={styles.title}>Use the camera to scan a book</Text>
        <Text style={styles.muted}>
          Point at the ISBN barcode. On the web this uses your webcam. MyHomeLib never records
          video.
        </Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      collapsable={false}
      onLayout={(event) =>
        setBox({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
      style={styles.preview}
    >
      {box.width > 0 ? (
        <CameraView
          facing={Platform.OS === "web" ? "front" : "back"}
          style={{ width: box.width, height: box.height }}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
          }}
          onBarcodeScanned={
            listening
              ? ({ data }) => {
                  if (data === last.current) {
                    return;
                  }
                  last.current = data;
                  onIsbn(data);
                }
              : undefined
          }
        />
      ) : null}
      <View style={styles.reticle} pointerEvents="none" />
      <Text style={styles.hint}>Align the barcode in the box</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: 160,
    backgroundColor: "rgba(20,14,8,0.55)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
  },
  preview: {
    height: Platform.OS === "web" ? 200 : 280,
    backgroundColor: "#050806",
    justifyContent: "flex-end",
    marginHorizontal: 20,
  },
  reticle: {
    position: "absolute",
    left: 28,
    right: 28,
    top: "32%",
    height: 88,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.mossBright,
  },
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: "center",
    color: theme.ink,
    fontWeight: "700",
    fontSize: 13,
    paddingVertical: 10,
    backgroundColor: "rgba(12,22,17,0.55)",
  },
  title: {
    fontFamily: theme.serif,
    fontSize: 18,
    fontWeight: "700",
    color: theme.gold,
    textAlign: "center",
  },
  muted: { color: theme.muted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  button: {
    backgroundColor: theme.gold,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { color: theme.bg, fontSize: 16, fontWeight: "700" },
});
