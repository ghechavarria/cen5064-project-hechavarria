/**
 * Component: LibraryStats — the library at a glance on the Account tab: a tile
 * per shelf and reading list (its menu icon, a glowing count, a label), each in
 * its own color from the forest, and a reading-progress bar for the owned
 * books, purple fading into pink.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps } from "react";
import { Text, View } from "react-native";
import { LibraryStat, ReadingProgress } from "../model/libraryAppModel";
import { bloomFade, statTones, styles } from "../styles/libraryStats.styles";
import { icon } from "../styles/theme";

// Each count wears the icon its tab uses in the menu bar (Read: the leaf on TBR's Read switch).
const ICONS: Record<LibraryStat["key"], ComponentProps<typeof Ionicons>["name"]> = {
  owned: "library-outline",
  toRead: "bookmark-outline",
  read: "leaf-outline",
  wanted: "heart-outline",
};

export function LibraryStats({ stats, progress }: { stats: LibraryStat[]; progress: ReadingProgress }) {
  const share = progress.owned === 0 ? 0 : progress.read / progress.owned;
  return (
    <View style={styles.wrap}>
      <View style={styles.tiles}>
        {stats.map((stat) => {
          const tone = statTones[stat.key];
          return (
            <LinearGradient
              key={stat.key}
              colors={tone.glass}
              style={[styles.tile, { borderColor: tone.edge }]}
              accessible
              accessibilityLabel={`${stat.label}: ${stat.count}`}
            >
              <Ionicons name={ICONS[stat.key]} size={icon.small} color={tone.color} />
              <Text style={[styles.count, { color: tone.color, textShadowColor: tone.glow }]}>{stat.count}</Text>
              <Text style={styles.label}>{stat.label}</Text>
            </LinearGradient>
          );
        })}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={progress.summary}
        accessibilityValue={{ min: 0, max: progress.owned, now: progress.read }}
      >
        <View style={styles.progressHead}>
          <Text style={styles.progressText}>{progress.summary}</Text>
          <Text style={styles.percent}>{Math.round(share * 100)}%</Text>
        </View>
        <View style={styles.track}>
          <LinearGradient colors={bloomFade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${share * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}
