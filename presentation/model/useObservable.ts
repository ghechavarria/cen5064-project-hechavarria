/**
 * Presentation model: the bridge from an Observable class to React.
 * A component calling useObservable(model) re-renders whenever the model's state changes.
 */
import { useSyncExternalStore } from "react";
import { Observable } from "./observable";

export function useObservable<State>(model: Observable<State>): State {
  return useSyncExternalStore(model.subscribe, model.getState, model.getState);
}
