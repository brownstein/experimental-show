#!/usr/bin/env electron
"use strict";
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');

// arguments to this command are always 2 args in (after electron .)
const cmdArgs = process.argv.slice(2);

// loader for specified file
function loadTargetFile(targetFileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(targetFileName, (err, buff) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      try {
        resolve(JSON.parse(buff));
      }
      catch (err) {
        console.error(err);
        process.exit(1);
      }
    });
  });
}

// need global reference to prevent GC deref
let mainWindow;
function createWindow () {

  // kick off loading he target file
  const targetFileName = loadTargetFile(process.argv[2]);
  const fileLoadStub = targetFileName;

  // set up UI readiness callback
  const windowLoadStub = new Promise((resolve, reject) => {
    ipcMain.on("UI-ready", (event, msg) => {
      resolve(msg || "UI-ready");
    });
  });

  // init all the things
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    title: `Show ${targetFileName}`
  });
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, "index.html"),
    protocol: "file:",
    slashes: true
  }));

  // show console
  // mainWindow.webContents.openDevTools();

  // exit handler
  mainWindow.on("closed", function () {
    mainWindow = null;
    process.exit(0);
  });

  // when file and window are loaded, send file to window
  let fileContents;
  Promise.all([
    windowLoadStub,
    fileLoadStub.then(contents => fileContents = contents),
  ])
  .then(() => {
    mainWindow.webContents.send("render-request", fileContents);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
