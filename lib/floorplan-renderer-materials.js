"use strict";
const three = require("three");
const colors = require("./colors");

// rotation array for things that require multiple distinct colors
const _colorRotation = [
	colors.st.white,
	colors.st.turquoise,
	colors.st.pink,
	colors.st.orange,
	colors.st.teal,
	colors.st.blue
];

module.exports.perimeterLines = () => new three.LineBasicMaterial({
	color: colors.st.magenta,
	linewidth: 3
});
