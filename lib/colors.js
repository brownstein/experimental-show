"use strict";
const three = require("three");

const rgb = (r,g,b) => new three.Color(r/255, g/255, b/255);

// Socialtables colors (from style guide)
module.exports = {
	st: {
		pink:      rgb(203, 85,  153),
		green:     rgb(158, 205, 117),
		turquoise: rgb(73,  198, 183),
		teal:      rgb(79,  141, 157),
		blue:      rgb(101, 160, 214),
		magenta:   rgb(203, 85,  153),
		orangered: rgb(230, 97,  93),
		orange:    rgb(234, 141, 99),
		white:     rgb(255, 255, 255),
		gray1:     rgb(234, 237, 239),
		gray2:     rgb(203, 209, 212)
	}
};
