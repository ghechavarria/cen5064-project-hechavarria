/**
 * Component: LetterRail — the A–Z index down the right edge of the catalog.
 * Tap or drag: the letter under the finger shows in a bubble and onJump gets
 * the section to scroll to. Letters with no books are dimmed.
 * The math lives in AlphabetRail.
 */
import { useMemo, useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";
import { AlphabetRail } from "../model/alphabetRail";
import { Catalog, CatalogSection } from "../model/catalog";
import { bubbleAt, styles } from "../styles/letterRail.styles";

export function LetterRail({
  sections,
  onJump,
}: {
  sections: CatalogSection[];
  onJump: (sectionIndex: number) => void;
}) {
  const railView = useRef<View>(null);
  const rail = useRef(new AlphabetRail()).current;
  const [scrub, setScrub] = useState<string | null>(null);
  // True while a finger (or mouse button) is down; the bubble only shows then.
  const touching = useRef(false);
  // Where the finger is now, so a late measurement still jumps to the right letter.
  const fingerY = useRef(0);
  // The gesture handler is created once, so it reads the latest props through a ref.
  const latest = useRef({ sections, onJump });
  latest.current = { sections, onJump };
  const available = AlphabetRail.lettersIn(sections);

  // Where the letter block sits on screen; measured on layout and again on each touch.
  function measure(then?: () => void) {
    railView.current?.measureInWindow((_x, y, _width, height) => {
      rail.measure(y, height);
      then?.();
    });
  }

  const pan = useMemo(() => {
    const jumpTo = (pageY: number) => {
      const letter = rail.letterAt(pageY);
      setScrub(touching.current ? letter : null);
      if (latest.current.sections.length > 0) {
        latest.current.onJump(AlphabetRail.sectionFor(letter, latest.current.sections));
      }
    };
    const release = () => {
      touching.current = false;
      setScrub(null);
    };
    const follow = (pageY: number) => {
      fingerY.current = pageY;
      jumpTo(pageY);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture for the whole drag; don't hand it to anything else mid-scrub.
      onPanResponderTerminationRequest: () => false,
      // Jump at once with the last measurement, then re-measure (the rail moves if the
      // screen resizes) and jump again to wherever the finger is by then.
      onPanResponderGrant: (event) => {
        touching.current = true;
        follow(event.nativeEvent.pageY);
        measure(() => jumpTo(fingerY.current));
      },
      onPanResponderMove: (event) => follow(event.nativeEvent.pageY),
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    });
  }, [rail]);

  return (
    // The whole column takes touches; the letters are a compact block in its middle,
    // and a finger above or below the block simply clamps to A or #.
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="A to Z index"
      style={styles.column}
      {...pan.panHandlers}
    >
      <View style={styles.backing}>
        <View ref={railView} style={styles.letters} onLayout={() => measure()}>
          {Catalog.LETTERS.map((letter) => (
            <Text
              key={letter}
              style={[
                styles.letter,
                !available.has(letter) && styles.letterEmpty,
                scrub === letter && styles.letterOn,
              ]}
            >
              {letter}
            </Text>
          ))}
          {scrub ? (
            <View style={[styles.bubble, bubbleAt(rail.centerOf(scrub))]} pointerEvents="none">
              <Text style={styles.bubbleText}>{scrub}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
