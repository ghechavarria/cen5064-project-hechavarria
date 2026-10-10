/**
 * Presentation styles: fonts. The whole app is set in Outfit, a modern
 * geometric sans, in four weights, so every screen reads as one family. The
 * font files ship with the app and App.tsx loads them once at start-up.
 */
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit";

export const fontAssets = { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold };

// Custom fonts carry their weight in the family name, so styles pick a family, not a fontWeight.
export const fonts = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
};
