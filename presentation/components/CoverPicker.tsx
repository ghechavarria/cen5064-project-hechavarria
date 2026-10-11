/**
 * Component: CoverPicker — the covers the sources offer for a scanned ISBN, side
 * by side on a halo of the chosen cover; tap the one that matches your copy, or
 * "Your photo" to photograph it.
 */
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { styles } from "../styles/coverPicker.styles";
import { icon, theme } from "../styles/theme";
import { BookCover } from "./BookCover";
import { CoverBackdrop } from "./CoverBackdrop";
import { Tappable } from "./Tappable";

export function CoverPicker({
  covers,
  selected,
  onSelect,
  onPhoto,
}: {
  covers: string[];
  selected: string;
  onSelect: (url: string) => void;
  onPhoto: () => void;
}) {
  return (
    <View style={styles.band}>
      <CoverBackdrop uri={selected} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {covers.map((url) => (
          <Tappable
            key={url}
            accessibilityRole="button"
            accessibilityState={{ selected: url === selected }}
            accessibilityLabel="Use this cover"
            onPress={() => onSelect(url)}
            style={[styles.tile, url === selected && styles.tileOn]}
          >
            <BookCover uri={url} style={styles.cover} />
            {url === selected ? (
              <View style={styles.check}>
                <Ionicons name="checkmark" size={icon.small} color={theme.bg} />
              </View>
            ) : null}
          </Tappable>
        ))}
        <Tappable
          accessibilityRole="button"
          accessibilityLabel="Photograph my cover"
          onPress={onPhoto}
          style={[styles.tile, styles.photo]}
        >
          <Ionicons name="camera-outline" size={icon.large} color={theme.glow} />
          <Text style={styles.photoText}>Your photo</Text>
        </Tappable>
      </ScrollView>
    </View>
  );
}
