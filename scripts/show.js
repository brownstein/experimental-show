#! /usr/bin/env node
const { spawn } = require("child_process");

const argv = process.argv.slice(2);

// spawn the electron app in that thing's general direction
const cmd = spawn("electron", [__dirname + "/.."].concat(argv));

// proxy output to console
cmd.stdout.on('data', (data) => {
  process.stdout.write(data);
});
cmd.stderr.on('data', (data) => {
  // silence Chromium warning bug (https://github.com/electron/electron/issues/4420)
  const dataStr = data.toString();
  if (/Couldn't set selectedTextBackgroundColor/.test(dataStr)) {
    return;
  }
  process.stderr.write(data);
});
cmd.on('close', (code) => {
  process.exit(code);
});
