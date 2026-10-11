/**
 * Component: LibraryPrompts — draws whichever popup the model says is open.
 * Every button calls a LibraryAppModel method; no decisions are made here.
 */
import { BookFormat, ReadingStatus, Shelf } from "../../domain";
import { AppState, LibraryAppModel } from "../model/libraryAppModel";
import { Labels } from "../model/labels";
import { PromptActions } from "../model/promptActions";
import { CoverPicker } from "./CoverPicker";
import { PromptModal } from "./PromptModal";

export function LibraryPrompts({ model, state }: { model: LibraryAppModel; state: AppState }) {
  const { prompt, giftName } = state;
  const draft = prompt?.kind === "scanConfirm" ? prompt.draft : null;
  // Every choice popup can be backed out of (phones have no Escape key or back gesture for modals).
  // During a scan that means "Nothing added"; during a move, nothing changes.
  const cancel = () => model.cancelPrompt();
  return (
    <>
      {/* Scan step 1: is this the book? Pick the cover that matches your copy. */}
      <PromptModal
        visible={draft !== null}
        title={draft?.metadata.title ?? "Is this the book?"}
        body={
          draft
            ? [
                draft.metadata.author,
                draft.metadata.isbn,
                [draft.metadata.publisher, draft.metadata.published, Labels.format(draft.format)]
                  .filter(Boolean)
                  .join(" · "),
                draft.alreadyInLibrary
                  ? "Already in your library. Confirm to add another copy."
                  : "Tap the cover that matches your copy.",
              ]
                .filter(Boolean)
                .join("\n")
            : undefined
        }
        onRequestClose={cancel}
        actions={[
          { label: "This is the book", onPress: () => model.confirmScan() },
          { label: "Not this book", tone: "secondary", onPress: cancel },
        ]}
      >
        {draft && !draft.alreadyInLibrary ? (
          <CoverPicker
            covers={draft.covers}
            selected={draft.cover}
            onSelect={(url) => model.selectCover(url)}
            onPhoto={() => void model.photographScanCover()}
          />
        ) : null}
      </PromptModal>

      {/* Scan step 2 (only when no source knew the binding): hardcover or paperback? */}
      <PromptModal
        visible={prompt?.kind === "format"}
        title="Hardcover or paperback?"
        body="Your book sources didn't say which binding this copy has."
        onRequestClose={cancel}
        actions={PromptActions.choices(
          [BookFormat.HARDCOVER, BookFormat.PAPERBACK],
          Labels.format,
          (format) => model.chooseFormat(format),
          cancel,
        )}
      />

      {/* Scan step 3: Owned or Wanted? */}
      <PromptModal
        visible={prompt?.kind === "scanShelf"}
        title="Where should it go?"
        body="Nothing is saved until you choose a shelf."
        onRequestClose={cancel}
        actions={PromptActions.choices(
          [Shelf.OWNED, Shelf.WANTED],
          Labels.shelf,
          (shelf) => model.chooseScanShelf(shelf),
          cancel,
        )}
      />

      {/* Purchased or gifted? (scan into Owned, or Wanted → Owned) */}
      <PromptModal
        visible={prompt?.kind === "acquire"}
        title="How did you get it?"
        body={prompt?.kind === "acquire" ? prompt.body : undefined}
        onRequestClose={cancel}
        actions={[
          { label: "Purchased", onPress: () => model.choosePurchased() },
          { label: "Gifted", tone: "secondary", onPress: () => model.chooseGifted() },
          PromptActions.cancel(cancel),
        ]}
      />

      {/* Who gave it? Continue does nothing until a name is typed. */}
      <PromptModal
        visible={prompt?.kind === "giftName"}
        title="Who gifted it?"
        body="A gifted copy needs the name of the person who gave it."
        input={{
          placeholder: "Name",
          value: giftName,
          onChangeText: (text) => model.setGiftName(text),
        }}
        onRequestClose={cancel}
        actions={[
          { label: "Continue", onPress: () => model.continueGift() },
          PromptActions.cancel(cancel),
        ]}
      />

      {/* Read or unread? (last step of scan and of every move) */}
      <PromptModal
        visible={prompt?.kind === "reading"}
        title="Have you read it?"
        body={prompt?.kind === "reading" ? prompt.body : undefined}
        onRequestClose={cancel}
        actions={PromptActions.choices(
          [ReadingStatus.UNREAD, ReadingStatus.READ],
          Labels.readingTitle,
          (status) => model.chooseReading(status),
          cancel,
        )}
      />

      {/* Delete confirmation */}
      <PromptModal
        visible={prompt?.kind === "delete"}
        title="Remove this title?"
        body={
          prompt?.kind === "delete"
            ? `Remove ${prompt.book.title} from your library? This deletes every copy.`
            : undefined
        }
        onRequestClose={cancel}
        actions={[
          { label: "Delete", tone: "danger", onPress: () => void model.confirmDelete() },
          { label: "Keep it", tone: "secondary", onPress: cancel },
        ]}
      />
    </>
  );
}
