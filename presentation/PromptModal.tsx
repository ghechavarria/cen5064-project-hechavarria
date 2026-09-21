/**
 * Presentation: confirm / choice / text popups (Scan cover, gift, delete).
 * Must not call fetch or SQL.
 */
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Art } from "./Art";
import { theme } from "./theme";

export function PromptModal({
  visible,
  title,
  body,
  coverUrl,
  input,
  actions,
  onRequestClose,
}: {
  visible: boolean;
  title: string;
  body?: string;
  coverUrl?: string;
  input?: { placeholder: string; value: string; onChangeText: (text: string) => void };
  actions: { label: string; tone?: "gold" | "ghost" | "danger"; onPress: () => void }[];
  onRequestClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>MyHomeLib</Text>
          {coverUrl != null ? (
            coverUrl ? (
              <Art source={{ uri: coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Ionicons name="book" size={36} color={theme.gold} />
              </View>
            )
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          {input ? (
            <TextInput
              style={styles.input}
              value={input.value}
              onChangeText={input.onChangeText}
              placeholder={input.placeholder}
              placeholderTextColor={theme.muted}
              autoFocus
            />
          ) : null}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              style={[
                styles.button,
                action.tone === "ghost" && styles.ghost,
                action.tone === "danger" && styles.danger,
              ]}
              onPress={action.onPress}
            >
              <Text
                style={[
                  styles.buttonText,
                  action.tone === "ghost" && styles.ghostText,
                  action.tone === "danger" && styles.dangerText,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: theme.border,
    gap: 8,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: theme.gold,
  },
  cover: {
    width: 112,
    height: 164,
    borderRadius: 12,
    backgroundColor: theme.pine,
    alignSelf: "center",
    marginVertical: 8,
    overflow: "hidden",
  },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  title: {
    fontFamily: theme.serif,
    fontSize: 22,
    fontWeight: "700",
    color: theme.gold,
    textAlign: "center",
  },
  body: { color: theme.muted, fontSize: 15, lineHeight: 22, marginBottom: 6, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: theme.bgRaised,
    color: theme.ink,
    minHeight: 52,
    marginVertical: 8,
  },
  button: {
    backgroundColor: theme.gold,
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: theme.bg, fontSize: 16, fontWeight: "700" },
  ghost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.gold },
  ghostText: { color: theme.gold },
  danger: { backgroundColor: theme.danger },
  dangerText: { color: theme.ink },
});
