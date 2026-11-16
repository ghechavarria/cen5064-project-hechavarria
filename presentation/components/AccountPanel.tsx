/**
 * Component: AccountPanel — the Account tab (core feature 4). Signed out, it
 * shows the form AccountModel is on (sign in, or create an account); signed in,
 * it shows the library at a glance (a count per shelf and reading list), the
 * account's details (email, member since, last synced), Sync now and Sign out. It only renders the models' state and
 * forwards taps to them.
 */
import { Text, View } from "react-native";
import { AccountForm, AccountModel, AccountState } from "../model/accountModel";
import { styles } from "../styles/accountPanel.styles";
import { Button } from "./Button";
import { Tappable } from "./Tappable";
import { TextField } from "./TextField";

type Detail = { label: string; value: string };
type Stat = { label: string; count: number };

export function AccountPanel({
  model,
  state,
  details,
  stats,
}: {
  model: AccountModel;
  state: AccountState;
  details: Detail[];
  stats: Stat[];
}) {
  if (!state.configured) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Your library stays on this phone</Text>
        <Text style={styles.body}>This copy of MyHomeLib has no account service, so there is nothing to sign in to.</Text>
      </View>
    );
  }
  return state.account ? (
    <SignedIn model={model} state={state} details={details} stats={stats} />
  ) : (
    <SignedOut model={model} state={state} />
  );
}

function SignedIn({
  model,
  state,
  details,
  stats,
}: {
  model: AccountModel;
  state: AccountState;
  details: Detail[];
  stats: Stat[];
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Your library</Text>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat} accessible accessibilityLabel={`${stat.label}: ${stat.count}`}>
            <Text style={styles.statCount}>{stat.count}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.title}>Your account</Text>
      <View>
        {details.map((detail) => (
          <View key={detail.label} style={styles.detail} accessible accessibilityLabel={`${detail.label}: ${detail.value}`}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text style={styles.detailValue}>{detail.value}</Text>
          </View>
        ))}
      </View>
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
