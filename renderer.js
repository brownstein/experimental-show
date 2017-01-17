"use strict";
const { ipcRenderer } = require('electron');
const { inferSchema, isV3Floor } = require("./lib/schema-inference");
const FloorplanRenderer = require("./lib/floorplan-renderer");
const KeyEventRouter = require("./lib/key-event-router");

function init() {

	// set up UI
	const keyRouter = new KeyEventRouter();
	const floorplanDomElement = document.getElementById("floorplan-view");
	const floorplanRenderer = new FloorplanRenderer({
		domElement: floorplanDomElement,
		keyRouter: keyRouter
	});
	floorplanRenderer.beginRendering();

	// set up rendering request handler
	ipcRenderer.on("render-request", (event, fileContents) => {
	  if (!isV3Floor(fileContents)) {
		  ipcRenderer.send("abort-on-unknown-file-type", "not a V3 floorplan");
	  }
	  const idToPoint = {};
	  fileContents.points.forEach(p => idToPoint[p.id] = p);
	  floorplanRenderer.addBoundariesRaw ("bounds", fileContents.boundaries.map(b => [
		  idToPoint[b.start_point_id],
		  idToPoint[b.end_point_id]
	  ]));
	  floorplanRenderer.zoomToFit();
	});

	// let the backend know we're good to go
	ipcRenderer.send("UI-ready", true);
}

init();
