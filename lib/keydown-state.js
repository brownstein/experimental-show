"use strict";

/**
 * Utility class that figures out if a given keyboard key is down.
 *
 * This resolves the variation in firing patterns across browsers, and works
 * great for Chromium-based stuff like Electron.
 */
module.exports = class KeyDownStateResolver {
	constructor() {
		this.timeouts = {};
		this.activeKeys = {};
		this.timeoutPeriodMS = 300;
		this.initialTimeoutMS = 1000;
		this.lastDateSample = new Date();
	}
	getKeydownHandler() {
		return event => {
			if (!this.timeouts[event.key]) {
				this.timeouts[event.key] = this.initialTimeoutMS;
			}
			else {
				this.timeouts[event.key] = this.timeoutPeriodMS;
			}
			this.activeKeys[event.key] = 1;
			this._scheduleNextTimeout();
		};
	}
	getKeyupHandler() {
		return event => {
			delete this.timeouts[event.key];
			delete this.activeKeys[event.key];
		};
	}
	isKeyDown(keyCode) {
		return this.activeKeys[keyCode] ? true : false;
	}
	_scheduleNextTimeout() {
		const keys = Object.keys(this.timeouts);
		if (keys.length == 0) {
			return;
		}
		let minTimeout = Infinity;
		for (let i=0; i<keys.length; i++) {
			const timeoutKey = keys[i];
			minTimeout = Math.min(minTimeout, this.timeouts[timeoutKey]);
		}
		if (minTimeout < Infinity) {
			setTimeout(() => {
				this._onTimeout();
			}, minTimeout);
		}
	}
	_onTimeout() {
		const now = new Date();
		const delta = now - this.lastDateSample;
		this.lastDateSample = now;
		Object.keys(this.timeouts).forEach(key => {
			this.timeouts[key] += -delta;
			if (this.timeouts[key] <= 0) {
				delete this.timeouts[key];
				delete this.activeKeys[key];
			}
		});
		this._scheduleNextTimeout();
	}
};
