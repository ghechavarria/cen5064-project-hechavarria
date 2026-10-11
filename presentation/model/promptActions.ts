/**
 * Presentation model: PromptActions — builds popup button lists, so every
 * multiple-choice popup works the same way: the first option is the primary
 * button, the others are secondary (outlined), and Cancel always comes last.
 */
export type ButtonTone = "primary" | "secondary" | "danger" | "dangerOutline";

export type PromptAction = { label: string; tone?: ButtonTone; onPress: () => void };

export class PromptActions {
  static choices<Option>(
    options: Option[],
    label: (option: Option) => string,
    choose: (option: Option) => void,
    cancel: () => void,
  ): PromptAction[] {
    return [
      ...options.map((option, index) => ({
        label: label(option),
        tone: index === 0 ? ("primary" as const) : ("secondary" as const),
        onPress: () => choose(option),
      })),
      PromptActions.cancel(cancel),
    ];
  }

  static cancel(onPress: () => void): PromptAction {
    return { label: "Cancel", tone: "secondary", onPress };
  }
}
