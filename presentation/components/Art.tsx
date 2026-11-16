/**
 * Component: Art / ArtFill — every image in the app goes through expo-image, so
 * covers are cached on the device and fade in instead of popping into place.
 * ArtFill is the forest behind every screen, framed by dark fades top and bottom.
 * The forest is sized for phones; on a wide browser window it is stretched and
 * looks pixelated, so there it is softly blurred (and enlarged a little, so the
 * blur's faded edges stay off screen).
 */
import { Image, ImageProps } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, View, ViewStyle } from "react-native";
import { forestBlur, imageFade, styles } from "../styles/art.styles";
import { scrim } from "../styles/theme";

type ArtSource = ImageProps["source"];

export function Art({
  source,
  style,
  blur,
}: {
  source: ArtSource;
  style?: StyleProp<ViewStyle>;
  blur?: number;
}) {
  return (
    <View style={[style, styles.clip]}>
      <Image
        source={source}
        contentFit="cover"
        blurRadius={blur}
        transition={imageFade}
        cachePolicy="memory-disk"
        style={styles.image}
      />
    </View>
  );
}

/** The forest stretched behind everything, faded into the night at the top and bottom. */
export function ArtFill({ source }: { source: ArtSource }) {
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Art source={source} style={[styles.fill, forestBlur && styles.blurredFill]} blur={forestBlur} />
      <LinearGradient colors={scrim.top} style={styles.scrimTop} />
      <LinearGradient colors={scrim.bottom} style={styles.scrimBottom} />
    </View>
  );
}
