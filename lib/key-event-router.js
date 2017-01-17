"use strict";

/**
 * Utility class that routes keyboard events to screen regions. This allows
 * text boxes to coexist next to 3D views with hotkeys or key-based panning.
 */
module.exports = class KeyEventRouter {
	constructor() {
		this.regions = {};
		this.handlers = {};
		this.currentRegion = null;
	}
	setFocus(regionName) {
		this.currentRegion = this.regions[regionName];
	}
	addRegion(regionName, domElement) {
		let region = this.regions[regionName||"_default"];
		if (!region) {
			region = { handlers: {} };
			this.regions[regionName||"_default"] = region;
		}
		domElement.onmouseover = e => {
			this.currentRegion = region;
			e.preventDefault();
		};
	}
	addEventListener(regionName, eventName, callback) {
		if (!this.handlers[eventName]) {
			this.handlers[eventName] = e => {
				if (this.currentRegion && this.currentRegion.handlers[eventName]) {
					this.currentRegion.handlers[eventName](e);
				}
			}
			window.addEventListener(eventName, this.handlers[eventName].bind(this), true);
		}
		let region = this.regions[regionName||"_default"];
		if (!region) {
			region = { handlers: {} };
			this.regions[regionName||"_default"] = region;
		}
		region.handlers[eventName] = callback;
	}
}
