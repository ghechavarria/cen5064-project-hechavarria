/**
 * Presentation styles: the design tokens every stylesheet builds on — colors,
 * spacing, corner radii, type sizes, and the shared surfaces and text looks.
 * Change a value here and the whole app follows.
 */
import { StyleSheet } from "react-native";
import { fonts } from "./fonts";

export const theme = {
  bg: "#050E1C",
  surface: "#0C1A2E", // inputs, cover placeholders
  card: "#12243C", // sheets and the menu dock (solid, so Android shadows draw cleanly)
  glass: "rgba(9,20,38,0.86)", // book cards: dark glass with the forest faintly behind
  panel: "rgba(18,36,60,0.82)", // a see-through card over the forest art
  ink: "#E8F0F4", // main text
  muted: "#B7C9D6", // secondary text
  glow: "#7EF0E0", // primary actions, focus, selection, icons
  glowSoft: "rgba(126,240,224,0.45)", // the halo behind large titles
  selected: "rgba(126,240,224,0.16)", // the pill behind a chosen tab or segment
  border: "rgba(126,240,224,0.35)", // quiet outlines
  danger: "#B5473A", // filled destructive button (light text on it passes contrast)
  dangerInk: "#F2917F", // destructive text and outlines on dark surfaces
  overlay: "rgba(5,14,28,0.78)",
  outline: "rgba(255,255,255,0.1)", // neutral hairline around covers and cards
  spine: "rgba(255,255,255,0.18)", // the lit edge of a book's spine
  spineShade: "rgba(0,0,0,0.28)", // the fold just inside the spine
  shadow: "#000000",
  veil: "rgba(9,20,38,0.15)", // light dimming over a blurred cover
  veilDeep: "rgba(9,20,38,0.6)",
  clear: "rgba(5,14,28,0)", // the night color at zero opacity, for fades
};

/** Spacing scale; `lg` is the screen gutter every page uses. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 6, md: 12, lg: 16, xl: 20, pill: 999 };

/** Type scale (font sizes). */
export const font = {
  tiny: 11,
  caption: 12,
  small: 13,
  body: 16,
  button: 16,
  title: 19,
  heading: 24,
  display: 38,
};

/** A layer that covers its parent exactly (backdrops, overlays). */
export const fillParent = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };

/** Icon sizes. */
export const icon = { small: 14, medium: 18, large: 22, back: 24, hero: 36 };

/** Soft glow under raised surfaces (iOS reads shadow*, Android reads elevation). */
export const softShadow = {
  shadowColor: theme.glow,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
};

/** A book's own shadow: it sits on the card like an object, not a sticker. */
const coverShadow = {
  shadowColor: theme.shadow,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.55,
  shadowRadius: 10,
  elevation: 8,
};

/** The standard card: dark glass with a hairline edge, so glow is saved for what's selected. */
export const cardSurface = {
  backgroundColor: theme.glass,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.outline,
};

/** Dark fades at the top and bottom of the forest, framing the art behind the header and dock. */
export const scrim = {
  top: [theme.bg, theme.clear] as const,
  bottom: [theme.clear, theme.bg] as const,
};

/** A see-through card for content sitting directly on the forest art. */
export const panelSurface = {
  backgroundColor: theme.panel,
  borderRadius: radius.xl,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.outline,
};

/** The frame every book cover sits in; BookCover clips the art inside it and adds the spine. */
export const coverSurface = {
  backgroundColor: theme.surface,
  borderRadius: radius.sm,
  ...coverShadow,
};

/** Shared text looks: one family (Outfit), a weight per role. */
export const text = {
  // Screen titles: bold and tightly tracked.
  display: { fontFamily: fonts.bold, letterSpacing: -1 },
  // Book titles, section names, popup titles.
  title: { fontFamily: fonts.semibold, letterSpacing: -0.3 },
  // Small interface text: meta lines, tab labels, tags.
  ui: { fontFamily: fonts.medium },
  // Buttons and emphasized values.
  strong: { fontFamily: fonts.semibold },
  body: { fontFamily: fonts.regular, color: theme.ink, fontSize: font.body, lineHeight: 24 },
  muted: { fontFamily: fonts.regular, color: theme.muted, fontSize: font.body, lineHeight: 24 },
  // Fixed-width digits, so counts and ISBNs line up and don't jitter as they change.
  tabular: { fontVariant: ["tabular-nums" as const] },
  // Section heading inside a card ("About", "Or type the ISBN").
  label: { fontFamily: fonts.semibold, color: theme.ink, fontSize: font.button, marginBottom: space.sm },
};
