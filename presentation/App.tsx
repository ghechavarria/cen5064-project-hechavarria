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
import { EmptyShelf } from "./components/EmptyShelf";
import { FlashBanner } from "./components/FlashBanner";
import { IsbnCamera } from "./components/IsbnCamera";
import { LibraryPrompts } from "./components/LibraryPrompts";
import { Logo } from "./components/Logo";
import { MenuBar } from "./components/MenuBar";
import { GroupedCatalog } from "./components/GroupedCatalog";
import { PullToSync } from "./components/PullToSync";
import { ScanForm } from "./components/ScanForm";
import { ScreenHeader } from "./components/ScreenHeader";
import { ShelfFilters } from "./components/ShelfFilters";
import { BrowserDevices } from "./device/browserDevices";
import { PhoneDevices } from "./device/phoneDevices";
import { AccountModel } from "./model/accountModel";
import { Catalog } from "./model/catalog";
import { LibraryAppModel, OWNED_MODES, SHELF_MODES } from "./model/libraryAppModel";
import { LibraryController } from "./model/libraryController";
import { useObservable } from "./model/useObservable";
import { belowStatusBar, styles } from "./styles/app.styles";
import { fontAssets } from "./styles/fonts";

const OWNER_ID = "local";
// To be read's small grouping switch: A–Z, Author, Series.
const SHELF_SEGMENTS = Catalog.groupings
  .filter((grouping) => SHELF_MODES.includes(grouping.mode))
  .map((grouping) => ({ key: grouping.mode, label: grouping.label }));
const SAFETY_SYNC_MS = 30_000;
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

  // Back on screen: sync, in case a change from another device was missed
  // meanwhile. While on screen, also check every 30 s (ADR-013).
  useEffect(() => {
    let stopChecking: (() => void) | null = account.syncEvery(SAFETY_SYNC_MS);
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") {
        void account.sync();
        stopChecking = stopChecking ?? account.syncEvery(SAFETY_SYNC_MS);
      } else {
        stopChecking?.();
        stopChecking = null;
      }
    });
    return () => {
      subscription.remove();
      stopChecking?.();
    };
  }, [account]);

  if (!state.ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={[styles.shell, belowStatusBar(insets.top)]}>
        <ArtFill source={FOREST} />
        <View style={styles.loading}>
          <Logo size="large" systemFont={!fontsLoaded} />
          <Text style={styles.muted}>Opening the stacks…</Text>
        </View>
      </View>
    );
  }

  const page = model.page;
  const selected = model.selected;
  const bookList = model.bookList;
  // The book lists sync when pulled down, while someone is signed in.
  const pullToSync = model.canRefresh ? (
    <PullToSync refreshing={state.refreshing} onRefresh={() => void model.refresh()} />
  ) : undefined;

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

        {page === "tbr" && !model.locked ? (
          // One slim row: Unread / Read, and the grouping button.
          <ShelfFilters
            groupings={SHELF_SEGMENTS}
            grouping={state.tbrMode}
            onGrouping={(mode) => model.setTbrMode(mode)}
            readings={model.readingSegments}
            reading={state.reading}
            onReading={(status) => model.showReading(status)}
          />
        ) : null}

        <FlashBanner flash={state.flash} onDismiss={() => model.dismissFlash()} />

        {/* The camera sits outside the ScrollView so it keeps a fixed size. */}
        {page === "scan" && !model.locked ? (
          <IsbnCamera
            available={model.cameraAvailable}
            listening={model.cameraListening}
            onIsbn={(code) => void model.scan(code)}
          />
        ) : null}

        <View style={styles.stage}>
          {model.locked && page !== "account" ? (
            <View style={styles.inset}>
              <EmptyShelf
                iconName="person-circle-outline"
                title="Sign in to see your library"
                message="Your books are kept in your account, so you can see them on any phone."
                action={{ label: "Go to Account", onPress: () => model.selectTab("account") }}
              />
            </View>
          ) : page === "owned" ? (
            <GroupedCatalog
              books={state.view.owned}
              modes={OWNED_MODES}
              mode={state.catalogMode}
              empty={{
                iconName: "library-outline",
                title: "No owned books yet",
                message: "Scan an ISBN onto Owned to fill this catalog.",
              }}
              onMode={(mode) => model.setCatalogMode(mode)}
              onOpen={openBook}
              onRenameGiver={(name) => model.askRenameGiver(name)}
              refreshControl={pullToSync}
            />
          ) : page === "wanted" ? (
            <GroupedCatalog
              books={state.view.wanted}
              modes={SHELF_MODES}
              mode={state.wantedMode}
              empty={{
                iconName: "leaf-outline",
                title: "The shelf is quiet",
                message: "Scan an ISBN onto Wanted.",
                action: { label: "Scan a book", onPress: () => model.selectTab("scan") },
              }}
              onMode={(mode) => model.setWantedMode(mode)}
              onOpen={openBook}
              refreshControl={pullToSync}
            />
          ) : bookList ? (
            // To be read: grouped by the small switch above, with the rail, like Owned and Wanted.
            <GroupedCatalog
              books={bookList.books}
              modes={SHELF_MODES}
              mode={state.tbrMode}
              showSwitch={false}
              listKey={state.reading}
              empty={{
                iconName: "leaf-outline",
                title: "The shelf is quiet",
                message: bookList.empty,
                action: { label: "Scan a book", onPress: () => model.selectTab("scan") },
              }}
              onMode={(mode) => model.setTbrMode(mode)}
              onOpen={openBook}
              refreshControl={pullToSync}
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
              {page === "account" ? (
                <AccountPanel
                  model={account}
                  state={accountState}
                  details={model.accountDetails}
                  library={model.librarySummary}
                  onOpenBook={openBook}
                  onShowGifts={() => model.showGifts()}
                  onOpenStat={(key) => model.openStat(key)}
                />
              ) : null}
              {page === "detail" && selected ? (
                <BookDetail
                  book={selected}
                  onToggleReading={() => void model.toggleReading()}
                  onChangeCover={() => void model.changeCover()}
                  onMoveToOwned={() => model.moveSelected(Shelf.OWNED)}
                  onMoveToWanted={() => model.moveSelected(Shelf.WANTED)}
                  onDelete={() => model.askDelete()}
                  onEditAcquisition={() => model.editAcquisition()}
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
