/**
 * Presentation model: Observable — reusable base class for state holders.
 * A subclass keeps its state private and changes it only through setState;
 * every change notifies subscribers. React subscribes with useObservable, so
 * screens re-render without the model knowing anything about React.
 */
export abstract class Observable<State> {
  private readonly listeners = new Set<() => void>();

  protected constructor(private current: State) {}

  // Arrow properties keep `this` bound when React calls them directly.
  readonly getState = (): State => this.current;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // Replace the changed fields with a new state object, then notify.
  protected setState(patch: Partial<State>): void {
    this.current = { ...this.current, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
