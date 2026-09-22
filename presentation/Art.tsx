/**
 * Presentation: forest background and wood nav art wrappers.
 * Must not call fetch or SQL.
 */
import { createElement } from "react";
import {
  Image,
  ImageSourcePropType,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

function uriOf(source: ImageSourcePropType): string {
  if (typeof source === "string") {
    return source;
  }
  if (typeof source === "number") {
    return Image.resolveAssetSource(source)?.uri ?? "";
  }
  if (Array.isArray(source)) {
    return uriOf(source[0]);
  }
  return source?.uri ?? Image.resolveAssetSource(source)?.uri ?? "";
}

export function Art({
  source,
  style,
  resizeMode = "cover",
}: {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "stretch" | "contain";
}) {
  return (
    <View style={[style, { overflow: "hidden" }]}>
      {Platform.OS === "web" ? (
        createElement("img", {
          src: uriOf(source),
          alt: "",
          style: {
            width: "100%",
            height: "100%",
            objectFit: resizeMode === "stretch" ? "fill" : resizeMode,
            opacity: 1,
            display: "block",
          },
        })
      ) : (
        <Image source={source} resizeMode={resizeMode} style={{ width: "100%", height: "100%" }} />
      )}
    </View>
  );
}

export function ArtFill({
  source,
  resizeMode = "cover",
}: {
  source: ImageSourcePropType;
  resizeMode?: "cover" | "stretch" | "contain";
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Art source={source} resizeMode={resizeMode} style={StyleSheet.absoluteFill} />
    </View>
  );
}
