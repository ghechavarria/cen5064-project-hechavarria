/**
 * Starts Expo CLI without FORCE_COLOR / NO_COLOR / CI so Metro prints a QR code.
 */
delete process.env.FORCE_COLOR;
delete process.env.NO_COLOR;
delete process.env.CI;

require("child_process")
  .spawn(
    process.execPath,
    [require.resolve("expo/bin/cli"), "start", ...process.argv.slice(2)],
    { stdio: "inherit", env: process.env },
  )
  .on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
