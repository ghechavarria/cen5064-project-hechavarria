# Creational pattern map (Lecture 6)

Each of the five creational patterns checked against MyHomeLib's real code: a genuine home, or an honest "no".

| Pattern | In MyHomeLib | The "don't" that would make it a bolt-on |
|---|---|---|
| **Factory Method** | **No genuine fit, because** no shared flow has a creation step that subclasses vary. `LibraryUseCase.updateBook` and `CatalogGrouping.sections` are Template Methods whose varying step decides a rule or a section key, not which object to create. The static creators `AcquisitionRecord.restore`, `SqliteBookRepository.open` and `ScanDraft.from` are Simple Factories (one static method picks or prepares the object), not Factory Method. | Adding an abstract `createX()` to a flow that never needed one, just to have the pattern. |
| **Abstract Factory** | **Genuine fit:** the device services. A phone gets the real cover camera and haptic feedback; the browser build gets a camera that explains it isn't available and silent feedback. These must match: a phone camera in the browser, or a browser "no camera" message on a phone, is a broken app. Before this change, four classes each asked "am I in a browser?" themselves (`ExpoCoverCamera`, `Haptics`, `IsbnCamera`, plus the store in `bootstrap.ts`). **Implemented:** `DeviceFamily` with `PhoneDevices` and `BrowserDevices`, chosen once in `App.tsx`. | Using it for a single product. Here there are two products (camera, feedback) that must stay a matched set. |
| **Builder** | **No genuine fit, because** the one object with many optional parts, `Book`, already takes a named-props object (`BookProps`): every value is named at the call site and every optional field has a default, so there is no telescoping constructor to fix. A `Book.Builder` would repeat `BookProps` field by field. | Building something that is already readable and has no construction stages. |
| **Prototype** | **No genuine fit, because** nothing is cloned from a configured template. `ScanDraft.withCover` / `withFormat` return a new immutable draft with one choice changed (copy-on-write of a value object), and building a draft is cheap. Noted while checking: drafts share their `covers` array, which is safe only because no code mutates it. | Shallow-copying mutable state: a draft that pushed into the shared `covers` array would change every other draft. |
| **Singleton** | **No genuine fit, because** every one-of-a-kind object (the view model, the use cases, the device store) is already created once at the root and injected, so nothing needs to guard the count. The one place the lecture's trap did appear was `Haptics`, an all-static class called from three components ("everything static has the same trap with none of the control"). The Abstract Factory change fixes that by injecting feedback instead. | Scattering `getInstance()` (or static calls) through the code instead of injecting the one instance. |

## The single best fit: Abstract Factory

**Why it wins:** it is the only pattern here that removes a real problem instead of renaming code that already works.

- **The platform decision lives in one place.** `App.tsx` picks `PhoneDevices` or `BrowserDevices` once, and everything else gets the matched set. Before, the same `Platform.OS === "web"` check was repeated in three presentation classes (and once for the store), and each class mixed its phone behavior with its browser fallback.
- **Each class does one thing.** `ExpoCoverCamera` is only the phone camera; `BrowserCoverCamera` is only the "use your phone" refusal; `HapticFeedback` is only haptics; `SilentFeedback` does nothing.
- **Feedback is injected, not static.** The view model now triggers the tick or buzz in the same action methods that change the tab or show a message, so it is tested like the camera, through a fake family.

**Not included:** the device store (SQLite or browser storage) stays in `bootstrap.ts`. It belongs to the Data tier, and a Presentation-tier factory that created it would break the dependency rule.
