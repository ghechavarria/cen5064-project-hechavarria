/**
 * Component: AccountPanel — the Account tab (core feature 4). Signed out, it
 * shows the form AccountModel is on (sign in, or create an account); signed in, it shows who is signed in with Sync now
 * and Sign out. It only renders AccountModel's state and forwards taps to it.
 */
import { Text, View } from "react-native";
import { AccountForm, AccountModel, AccountState } from "../model/accountModel";
import { styles } from "../styles/accountPanel.styles";
import { Button } from "./Button";
import { Tappable } from "./Tappable";
import { TextField } from "./TextField";

export function AccountPanel({ model, state }: { model: AccountModel; state: AccountState }) {
  if (!state.configured) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Your library stays on this phone</Text>
        <Text style={styles.body}>This copy of MyHomeLib has no account service, so there is nothing to sign in to.</Text>
      </View>
    );
  }
  return state.account ? <SignedIn model={model} state={state} /> : <SignedOut model={model} state={state} />;
}

function SignedIn({ model, state }: { model: AccountModel; state: AccountState }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.body}>Signed in as</Text>
      <Text style={styles.email}>{state.account?.email}</Text>
      <Notice state={state} />
      <View style={styles.actions}>
        <Button
          label={state.sync === "syncing" ? "Syncing…" : "Sync now"}
          tone="secondary"
          onPress={() => void model.sync()}
          disabled={state.sync === "syncing"}
        />
        <Button label="Sign out" tone="secondary" onPress={() => void model.signOut()} disabled={state.busy} />
      </View>
    </View>
  );
}

const TITLES: Record<AccountForm, string> = {
  signIn: "Sign in",
  signUp: "Create an account",
};

function SignedOut({ model, state }: { model: AccountModel; state: AccountState }) {
  const { form } = state;
  const submit = () => void model.submit();
  const newPassword = form === "signUp";
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{TITLES[form]}</Text>
      <Field label="Email">
        <TextField
          value={state.email}
          onChangeText={(email) => model.setEmail(email)}
          placeholder="you@example.com"
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
      </Field>
      <Field label={newPassword ? "New password (at least 8 characters)" : "Password"}>
        <TextField
          value={state.password}
          onChangeText={(password) => model.setPassword(password)}
          accessibilityLabel="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete={newPassword ? "new-password" : "current-password"}
          textContentType={newPassword ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </Field>
      <Notice state={state} />
      <Button label={state.busy ? "One moment…" : model.submitLabel} onPress={submit} disabled={state.busy} />
      <View style={styles.links}>
        {form === "signIn" ? (
          <Link label="Create an account" onPress={() => model.showForm("signUp")} />
        ) : (
          <Link label="Back to sign in" onPress={() => model.showForm("signIn")} />
        )}
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// Read aloud as it appears, so a screen reader hears what went wrong.
function Notice({ state }: { state: AccountState }) {
  return state.notice ? (
    <Text accessibilityLiveRegion="polite" style={[styles.notice, state.notice.tone === "danger" && styles.danger]}>
      {state.notice.text}
    </Text>
  ) : null;
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tappable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Tappable>
  );
}
