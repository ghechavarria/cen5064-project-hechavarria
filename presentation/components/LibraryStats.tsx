/**
 * Component: LibraryStats — the library at a glance on the Account tab: a tile
 * per shelf and reading list (its menu icon, a glowing count, a label), each in
 * its own color from the forest, under a reading ring for the owned books with
 * a headline and a line of encouragement beside it.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps } from "react";
import { Text, View } from "react-native";
import { LibraryStat, ReadingProgress } from "../model/libraryAppModel";
import { statTones, styles } from "../styles/libraryStats.styles";
import { icon } from "../styles/theme";
import { ReadingRing } from "./ReadingRing";
import { Tappable } from "./Tappable";

// Each count wears the icon its tab uses in the menu bar (Read: the leaf on TBR's Read switch).
const ICONS: Record<LibraryStat["key"], ComponentProps<typeof Ionicons>["name"]> = {
  owned: "library-outline",
  toRead: "bookmark-outline",
  read: "leaf-outline",
  wanted: "heart-outline",
};

export function LibraryStats({
  stats,
  progress,
  onOpenStat,
}: {
  stats: LibraryStat[];
  progress: ReadingProgress;
  onOpenStat: (key: LibraryStat["key"]) => void;
}) {
  const share = progress.owned === 0 ? 0 : progress.read / progress.owned;
  return (
    <View style={styles.wrap}>
      <View
        style={styles.hero}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${progress.headline}. ${progress.note}`}
        accessibilityValue={{ min: 0, max: Math.max(progress.owned, 1), now: progress.read }}
      >
        <ReadingRing share={share} />
        <View style={styles.heroText}>
          <Text style={styles.headline}>{progress.headline}</Text>
          <Text style={styles.note}>{progress.note}</Text>
        </View>
      </View>
      <View style={styles.tiles}>
        {stats.map((stat) => {
          const tone = statTones[stat.key];
          return (
            // Each tile opens the list it counts.
            <Tappable
              key={stat.key}
              accessibilityRole="button"
              accessibilityLabel={`${stat.label}: ${stat.count}. Show them`}
              onPress={() => onOpenStat(stat.key)}
              style={styles.tileTap}
            >
              <LinearGradient colors={tone.glass} style={[styles.tile, { borderColor: tone.edge }]}>
                <Ionicons name={ICONS[stat.key]} size={icon.small} color={tone.color} />
                <Text style={[styles.count, { color: tone.color, textShadowColor: tone.glow }]}>{stat.count}</Text>
                <Text style={styles.label}>{stat.label}</Text>
              </LinearGradient>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}
