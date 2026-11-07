/**
 * Presentation root: the TBR / Owned / Wanted / Scan / Account screens.
 *
 * MVVM: LibraryAppModel (a class) owns all screen state and behavior; this
 * file only lays out components from that state and forwards taps to the
 * model. Styles come from styles/app.styles.ts.
 *
 * The model reaches the Service use cases through LibraryController, and the
 * account use cases through AccountModel; bootstrap.ts wires both up.
 */
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { AppState, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { CompositionRoot } from "../bootstrap";
import { AccountPanel } from "./components/AccountPanel";
import { Book, Shelf } from "../domain";
import { ArtFill } from "./components/Art";
import { BookDetail } from "./components/BookDetail";
import { BookList } from "./components/BookList";
import { FlashBanner } from "./components/FlashBanner";
import { IsbnCamera } from "./components/IsbnCamera";
import { LibraryPrompts } from "./components/LibraryPrompts";
import { Logo } from "./components/Logo";
import { MenuBar } from "./components/MenuBar";
import { OwnedCatalog } from "./components/OwnedCatalog";
import { ScanForm } from "./components/ScanForm";
import { ScreenHeader } from "./components/ScreenHeader";
import { SegmentedControl } from "./components/SegmentedControl";
import { BrowserDevices } from "./device/browserDevices";
import { PhoneDevices } from "./device/phoneDevices";
import { AccountModel } from "./model/accountModel";
import { LibraryAppModel } from "./model/libraryAppModel";
import { LibraryController } from "./model/libraryController";
import { useObservable } from "./model/useObservable";
import { belowStatusBar, styles } from "./styles/app.styles";
import { fontAssets } from "./styles/fonts";

const OWNER_ID = "local";
const FOREST = require("../assets/forest-bg.png");

export function App() {
  return (
    <SafeAreaProvider>
      <LibraryScreen />
    </SafeAreaProvider>
  );
}

function LibraryScreen() {
  const insets = useSafeAreaInsets();
  // The models live as long as the app. Both get their use cases from one
  // bootstrap call; the device family is chosen here once (Abstract Factory).
  const [{ model, account }] = useState(() => {
    const services = CompositionRoot.open();
    const accountModel = new AccountModel(async () => (await services).account, OWNER_ID);
    return {
      account: accountModel,
      model: new LibraryAppModel(
        async () => new LibraryController((await services).library, OWNER_ID),
        Platform.OS === "web" ? new BrowserDevices() : new PhoneDevices(),
        accountModel,
      ),
    };
  });
  const state = useObservable(model);
  const accountState = useObservable(account);
  // Bundled fonts; if they fail to load, the system font is used instead.
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // One stable handler for every book card, so memoized cards don't re-render.
  const openBook = useCallback((book: Book) => model.openBook(book), [model]);

  useEffect(() => {
    void model.start();
    return () => model.dispose();
  }, [model]);

  // Back on screen: sync, in case a change from another phone was missed meanwhile.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") {
        void account.sync();
      }
    });
    return () => subscription.remove();
  }, [account]);

  if (!state.ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={[styles.shell, belowStatusBar(insets.top)]}>
        <ArtFill source={FOREST} />
        <View style={styles.loading}>
          <Logo size="large" />
          <Text style={styles.muted}>Opening the stacks…</Text>
        </View>
      </View>
    );
  }

  const page = model.page;
  const selected = model.selected;
  const bookList = model.bookList;

  return (
    <View style={styles.shell}>
      <ArtFill source={FOREST} />
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.frame}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader
          heading={model.heading}
          hint={model.hint}
          topInset={insets.top}
          onBack={page === "detail" ? () => model.back() : undefined}
        />

        {page === "tbr" ? (
          <SegmentedControl
            segments={model.readingSegments.map(({ key, label, read }) => ({
              key,
              label,
              icon: read ? "leaf-outline" : undefined,
            }))}
            selected={state.reading}
            onSelect={(status) => model.showReading(status)}
          />
        ) : null}

        <FlashBanner flash={state.flash} onDismiss={() => model.dismissFlash()} />

        {/* The camera sits outside the ScrollView so it keeps a fixed size. */}
        {page === "scan" ? (
          <IsbnCamera
            available={model.cameraAvailable}
            listening={model.cameraListening}
            onIsbn={(code) => void model.scan(code)}
          />
        ) : null}

        <View style={styles.stage}>
          {page === "owned" ? (
            <OwnedCatalog
              books={state.view.owned}
              mode={state.catalogMode}
              onMode={(mode) => model.setCatalogMode(mode)}
              onOpen={openBook}
            />
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.main}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {page === "scan" ? (
                <ScanForm
                  isbn={state.isbnDraft}
                  busy={state.busy}
                  onChange={(text) => model.setIsbnDraft(text)}
                  onSubmit={() => void model.scan()}
                />
              ) : null}
              {bookList ? (
                <BookList
                  books={bookList.books}
                  empty={bookList.empty}
                  onOpen={openBook}
                  onScan={() => model.selectTab("scan")}
                />
              ) : null}
              {page === "account" ? <AccountPanel model={account} state={accountState} /> : null}
              {page === "detail" && selected ? (
                <BookDetail
                  book={selected}
                  onToggleReading={() => void model.toggleReading()}
                  onChangeCover={() => void model.changeCover()}
                  onMoveToOwned={() => model.moveSelected(Shelf.OWNED)}
                  onMoveToWanted={() => model.moveSelected(Shelf.WANTED)}
                  onDelete={() => model.askDelete()}
                />
              ) : null}
            </ScrollView>
          )}
        </View>

        <MenuBar active={state.tab} bottomInset={insets.bottom} onSelect={(tab) => model.selectTab(tab)} />
      </KeyboardAvoidingView>

      <LibraryPrompts model={model} state={state} />
    </View>
  );
}
