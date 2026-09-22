/**
 * Expo entry: registers the Presentation App. No use-case logic here.
 */
import "@expo/metro-runtime";
import { registerRootComponent } from "expo";
import { App } from "./presentation/App";

registerRootComponent(App);
