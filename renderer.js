// "use strict";
// const { ipcRenderer } = require('electron');
// const storage = require("node-persist");
//
// // init saved format persistence
// let ensureStorageReady = storage.init({
//   dir: `${__dirname}/user-config`
// }).then(() => ensureStorageReady = Promise.resolve());
//
// // set up rendering request handler
// ipcRenderer.on("render-request", (event, fileContents) => {
//   const fileStructure = getStructure(fileContents);
//   const fileStructureKey = flattenStructureDef(fileStructure);
//   console.log("structure key:", fileStructureKey);
//   ensureStorageReady.then(() => {
//     storage.getItem(fileStructureKey).then(item => {
//       if (!item) {
//         console.log("new format detected");
//       }
//       else {
//         console.log("format recognized");
//         console.log(item);
//       }
//       storage.setItem(fileStructureKey, {
//         "all good": true
//       });
//     });
//   });
// });
//
// // let the backend know we're good to go
// ipcRenderer.send("UI-ready", true);
//
// /**
//  * Structure inferrer for data
//  */
// function getStructure (instance) {
//   if (Array.isArray(instance)) {
//     return {
//       type: "array",
//       items: getStructure(instance[0]),
//       length: items.length
//     };
//   }
//   if (instance instanceof Object) {
//     const keys = Object.keys(instance);
//     let identicalKeyStruct = false;
//     if (keys.length >= 2) {
//       const subStructA = getStructure(instance[keys[0]]);
//       const subStructB = getStructure(instance[keys[1]]);
//       if (flattenStructureDef(subStructA) === flattenStructureDef(subStructB)) {
//         identicalKeyStruct = subStructA;
//       }
//     }
//     const ret = { type: "object" };
//     if (!identicalKeyStruct || (keys.length < 8)) {
//       const props = ret.properties = {};
//       Object.keys(instance).forEach(k => { props[k] = getStructure(instance[k]); });
//     }
//     if (identicalKeyStruct) {
//       ret.identicalProperties = identicalKeyStruct;
//     }
//     return ret;
//   }
//   switch (typeof instance) {
//     case "string":
//       return { type: "string" };
//     case "number":
//       return { type: "number" };
//     case "null":
//       return { type: "null" };
//     case "boolean":
//       return { type: "boolean" };
//     default:
//       return { unknown: true };
//   }
// }
//
// function flattenStructureDef (def) {
//   switch (def.type) {
//     case "string":
//       return "s";
//     case "number":
//       return "n";
//     case "boolean":
//       return "b";
//     case "null":
//       return "0";
//     case "array":
//       return "a[".concat(flattenStructureDef(def.items)).concat("]");
//     case "object":
//       if (def.identicalProperties) {
//         return "o[_identical::"+flattenStructureDef(def.identicalProperties)+"]";
//       }
//       if (def.properties) {
//         const props = Object.keys(def.properties);
//         props.sort();
//         return "o[".concat(props.map(pn =>
//           pn+":"+flattenStructureDef(def.properties[pn])).join("|")
//         ).concat("]");
//       }
//       return "o[]";
//   }
// }


"use strict";
const Delaunay = require("delaunay-fast");
const requirex = require("jsx-require-extension");
const t = require("./test.jsx");
console.log(t);

var canvas, gl, program, aspect;

const state = {
	t: 0,
	points: [],
	triangulationLines: [],
	constructs: []
};

const BACKGROUND_COLOR    = [0.025, 0.35, 0.6];
const POINT_COLOR         = [0.2, 0.2, 0.2];
const TRIANGULATION_COLOR = BACKGROUND_COLOR.map(c => c * 0.2);
const LINE_COLOR          = [0.4, 0.3, 0.1];

window.onload = init;
function init() {

		// start webgl and rendering cycle
		initViewport();
		render();

		// start the compute cycle
		setInterval(updateState, 30);
}

function initViewport() {

	// init canvas and webGL context
	canvas = document.getElementById("main");
	gl = canvas.getContext("webgl");
	program = gl.createProgram();
	const vtxShaderSrc = document.getElementById("2d-vertex-shader").text;
	const fragShaderSrc = document.getElementById("2d-fragment-shader").text;
	const vtxShader = gl.createShader(gl.VERTEX_SHADER);
	const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(vtxShader, vtxShaderSrc);
	gl.shaderSource(fragShader, fragShaderSrc);
	gl.compileShader(vtxShader);
	gl.compileShader(fragShader);
	gl.attachShader(program, vtxShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());

	// bind position and color data components
	const aPositionLoc = gl.getAttribLocation(program, "a_position");
	const aColorLoc = gl.getAttribLocation(program, "a_color");
	gl.enableVertexAttribArray(aPositionLoc);
	gl.enableVertexAttribArray(aColorLoc);
	gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 24, 0);
	gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 24, 8);

	// calculate initial viewport cordinates
	updateViewportCoordinates();

	// handle resizes
	window.addEventListener("resize", updateViewportCoordinates);
}

function updateViewportCoordinates() {
	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;
	aspect = canvas.width / canvas.height;
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.uniform2fv(gl.getUniformLocation(program, "u_offset"), [0.0, 0.0]);
	gl.uniform2fv(gl.getUniformLocation(program, "u_scale"), [1/aspect, 1.0]);
}

function render() {
		window.requestAnimationFrame(render, canvas);

		// redraw background
		gl.clearColor(...BACKGROUND_COLOR, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// make blending additive
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

		// draw points
		if (state.points.length) {
			const pc = POINT_COLOR;
			const ps = 0.01;
			const lineBuff = [];
			let lineBuffLen = 0;
			for (let i=0; i<state.points.length; i++) {
				const p = state.points[i];
				lineBuff.push(
					p.x, p.y - ps, pc[0], pc[1], pc[2], p.a,
					p.x, p.y + ps, pc[0], pc[1], pc[2], p.a,
					p.x - ps, p.y, pc[0], pc[1], pc[2], p.a,
					p.x + ps, p.y, pc[0], pc[1], pc[2], p.a
				);
				lineBuffLen+=4;
			}
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineBuff), gl.DYNAMIC_DRAW);
			gl.drawArrays(gl.LINES, 0, lineBuffLen);
		}

		// draw triangulation lines
		if (state.triangulationLines.length) {
			const pc = TRIANGULATION_COLOR;
			const pa = 1.0;
			const lineBuff = [];
			let lineBuffLen = 0;
			for (let i=0; i<state.triangulationLines.length; i++) {
				const l = state.triangulationLines[i];
				lineBuff.push(
					l[0][0], l[0][1], pc[0], pc[1], pc[2], pa,
					l[1][0], l[1][1], pc[0], pc[1], pc[2], pa
				);
				lineBuffLen+=2;
			}
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineBuff), gl.DYNAMIC_DRAW);
			gl.drawArrays(gl.LINES, 0, lineBuffLen);
		}

		if (state.constructs.length) {
			const pc = LINE_COLOR;
			const pa = 1;
			const lineBuff = [];
			let lineBuffLen = 0;
			for (let i=0; i<state.constructs.length; i++) {
				const c = state.constructs[i];
				lineBuff.push(
					c.x-c.dx*c.r, c.y-c.dy*c.r, pc[0], pc[1], pc[2], 0,
					c.x-c.dx*c.r*0.5, c.y-c.dy*c.r*0.5, pc[0], pc[1], pc[2], c.a,
					c.x-c.dx*c.r*0.5, c.y-c.dy*c.r*0.5, pc[0], pc[1], pc[2], c.a,
					c.x+c.dx*c.r*0.5, c.y+c.dy*c.r*0.5, pc[0], pc[1], pc[2], c.a,
					c.x+c.dx*c.r*0.5, c.y+c.dy*c.r*0.5, pc[0], pc[1], pc[2], c.a,
					c.x+c.dx*c.r, c.y+c.dy*c.r, pc[0], pc[1], pc[2], 0
				);
				lineBuffLen+=2;
			}
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineBuff), gl.DYNAMIC_DRAW);
			gl.drawArrays(gl.LINES, 0, lineBuffLen);
		}
}

// compute variance and line of best fit
const dot = (ax, ay, bx, by) => ((ax * bx) + (ay * by));
const mag = (ax, ay) => Math.sqrt(ax * ax + ay * ay);

function updateState() {
	state.t++;

	// step for points
	const addPoints = Math.min(500 - state.points.length, 6);
	switch (state.t % 3) {
		case 0:
			seedRandomPoints(addPoints);
			break;
		case 1:
			seedLinearPoints(addPoints / 6,    0, 0.8, -0.8, -0.5, 0.02, 0.001);
			seedLinearPoints(addPoints / 6,    0, 0.8,  0.8, -0.5, 0.05, 0.0015);
			seedLinearPoints(addPoints / 6, -0.8, -0.3, 0,    0.5, 0.01, 0.001);
			seedLinearPoints(addPoints / 6,  0.8, -0.3, 0,    0.5, 0.1,  0.002);
			seedLinearPoints(addPoints / 6,    0, -0.8, -0.8, 0.5, 0.15, 0.005);
			seedLinearPoints(addPoints / 6,    0, -0.8,  0.8, 0.5, 0.1, 0.01);
			break;
		default:
			const r = state.t/1000;
			const rx = 0;
			const ry = -Math.cos(((r*3) % 2) * Math.PI) * 0.1;
			[1/6, 5/6, 9/6]
				.map(o => ((r + o) % 2) * Math.PI)
				.forEach(theta => {
					const rdx = Math.cos(theta) * 0.8;
					const rdy = Math.sin(theta) * 0.75;
					seedLinearPoints(addPoints / 3, rx, ry, rdx, rdy, 0.01, 0.002);
				});
			break;
	}

	updateAllPoints();

	// step for found patterns
	findPatterns(state.points);
	updateAllConstructs();
}

function seedRandomPoints (n) {
	for (let i=0; i<n; i++) {
		const pnt = {
			x: (Math.random() - 0.5) * Math.max(2.5, aspect * 2),
			y: (Math.random() - 0.5) * 2.5,
			dx: (Math.random() - 0.5) * 0.01,
			dy: (Math.random() - 0.5) * 0.01,
			a: 0,
			lifeRemaining: 100
		};
		state.points.push(pnt);
	}
}

function seedLinearPoints (n, sx, sy, dx, dy, jitter, speed) {
	const dst = mag(dx, dy);
	const dxn = dx / dst;
	const dyn = dy / dst;
	for (let i = 1; i <= n; i++) {
		const a = Math.random() * dst;
		const b = (Math.random() - 0.5) * dst * jitter;
		const pnt = {
			x: sx + dxn * a - dyn * b,
			y: sy + dyn * a + dxn * b,
			dy: (Math.random() - 0.5) * speed,
			dx: (Math.random() - 0.5) * speed,
			a: 0,
			lifeRemaining: 100
		};
		pnt.x += -pnt.dx * 50;
		pnt.y += -pnt.dy * 50;
		state.points.push(pnt);
	}
}

function updateAllPoints() {
	const fadeTime = 10;
	state.points.forEach(p => {
		p.x += p.dx;
		p.y += p.dy;
		p.lifeRemaining--;
		p.a = 1;
		if (p.lifeRemaining <= fadeTime) {
			p.a = p.lifeRemaining / fadeTime;
		}
		else if (p.lifeRemaining > 100 - fadeTime) {
			p.a = (100 - p.lifeRemaining) / fadeTime;
		}
		// fade out a bit more
		p.a = p.a * 0.5;
	});
	state.points = state.points.filter(p => p.lifeRemaining > 0);
}

function findPatterns (points) {

	// triangulate point set
	const pointCoords = points.map(p => [p.x, p.y]);
	const triangulation = Delaunay.triangulate(pointCoords);

	// add each triangulation edge to the state
	const orderedKey = (ai, bi) => (ai > bi ? `${ai}:${bi}` : `${bi}:${ai}`);
	const peerMapping = {};
	const resultingEdges = [];
	for (let di = 0; di < triangulation.length; di += 3) {
		const a = triangulation[di+0];
		const b = triangulation[di+1];
		const c = triangulation[di+2];
		if (!peerMapping[a]) { peerMapping[a] = []; }
		if (!peerMapping[b]) { peerMapping[b] = []; }
		if (!peerMapping[c]) { peerMapping[c] = []; }
		if (
			(!~peerMapping[a].indexOf(b)) ||
			(!~peerMapping[b].indexOf(a))
		) {
			resultingEdges.push([pointCoords[a], pointCoords[b]]);
		}
		if (
			(!~peerMapping[a].indexOf(c)) ||
			(!~peerMapping[c].indexOf(a))
		) {
			resultingEdges.push([pointCoords[a], pointCoords[c]]);
		}
		if (
			(!~peerMapping[b].indexOf(c)) ||
			(!~peerMapping[c].indexOf(b))
		) {
			resultingEdges.push([pointCoords[b], pointCoords[c]]);
		}
		peerMapping[a].push(b);
		peerMapping[a].push(c);
		peerMapping[b].push(a);
		peerMapping[b].push(c);
		peerMapping[c].push(a);
		peerMapping[c].push(b);
	}
	state.triangulationLines = resultingEdges.map(e => [
		[e[0][0], e[0][1]],
		[e[1][0], e[1][1]]
	]);

	// with that out of the way, let's compute some constructs!
	let newConstructs = [];
	for (let pIndex = 0; pIndex < pointCoords.length; pIndex++){
		const pCoords = points[pIndex];
		const neighbors = getNeighbors(peerMapping, pIndex, 2);
		const ap = neighbors.map(i => points[i]);
		const nFit = computeLineOfDecentFitWithFalloff(pCoords, ap, 1.5);
		if (!nFit || (nFit.dSumCoeff < 0.8)) {
			continue;
		}
		const additionalNeighbors = getNeighborsOnLine(nFit, 0.15, points, peerMapping, pIndex, 4);
		if (!additionalNeighbors.length) {
			continue;
		}

		const additionalNeighborPnts = additionalNeighbors.map(i => points[i]);
		const bFit = computeLineOfDecentFit(additionalNeighborPnts);
		if (!bFit || (bFit.dSumCoeff < 0.8)) {
			continue;
		}

		let sumProjMag = 0;
		let sumMag = 0;
		for (let i=0; i<additionalNeighborPnts.length; i++) {
			const np = additionalNeighborPnts[i];
			const ndx = np.x - bFit.x;
			const ndy = np.y - bFit.y;
			const ndMag = mag(ndx, ndy);
			sumMag += ndMag;
			sumProjMag += Math.abs(dot(ndx, ndy, bFit.dx, bFit.dy));
		}
		const avgProjMag = sumProjMag / additionalNeighborPnts.length;

		newConstructs.push({
			x: bFit.x,
			y: bFit.y,
			dx: bFit.dx,
			dy: bFit.dy,
			r: 0.5 * avgProjMag * (sumProjMag / sumMag),
			a: 1,
			aMax: 1,
			lifeRemaining: 20,
			initialLife: 20
		});
	}

	state.constructs = state.constructs.concat(newConstructs);
}

// graph-based neighbor lookup to handle variable region density
function getNeighbors (peerMapping, startIndex, degrees) {
	 const marked = {};
	 const neighbors = [];
	 const frontier = [ startIndex ];
	 marked[startIndex] = 1;
	 let degreeCountdown = 1;
	 let degreesRemaining = degrees;
	 while (frontier.length > 0) {
		 if (degreeCountdown > 0) {
			 degreeCountdown--;
		 }
		 else {
			 degreesRemaining--;
			 if (degreesRemaining <= 0) {
				 break;
			 }
			 else {
				 degreeCountdown = frontier.length;
			 }
		 }
		 const nextPoint = frontier.shift();
		 const nextPointPeers = peerMapping[nextPoint];
		 for (let i=0; i<nextPointPeers.length; i++) {
			 const peerPoint = nextPointPeers[i];
			 if (marked[peerPoint]) {
				 continue;
			 }
			 marked[peerPoint] = 1;
			 neighbors.push(peerPoint);
			 frontier.push(peerPoint);
		 }
	 }
	 return neighbors;
}

function getNeighborsOnLine(line, maxOrthogMag, coordMapping, peerMapping, startIndex, degrees) {
	const marked = {};
	const neighbors = [];
	const frontier = [ startIndex ];
	marked[startIndex] = 1;
	let degreeCountdown = 1;
	let degreesRemaining = degrees;
	while (frontier.length > 0) {
		if (degreeCountdown > 0) {
			degreeCountdown--;
		}
		else {
			degreesRemaining--;
			if (degreesRemaining <= 0) {
				break;
			}
			else {
				degreeCountdown = frontier.length;
			}
		}
		const nextPoint = frontier.shift();
		const nextPointPeers = peerMapping[nextPoint];
		for (let i=0; i<nextPointPeers.length; i++) {
			const peerPoint = nextPointPeers[i];
			if (marked[peerPoint]) {
				continue;
			}
			marked[peerPoint] = 1;

			// ignore points outside the desired line
			const peerPos = coordMapping[peerPoint];
			const pdx = peerPos.x - line.x;
			const pdy = peerPos.y - line.y;
			const pOrthog = dot(-line.dy, line.dx, pdx, pdy);
			if (Math.abs(pOrthog) > maxOrthogMag) {
				continue;
			}

			neighbors.push(peerPoint);
			frontier.push(peerPoint);
		}
	}
	return neighbors;
}

/**
 * Computes a line of OK fit (less provably rigorous than best fit) between
 * a set of points.
 */
function computeLineOfDecentFit (localPoints) {

	// compute centroid
	let cx = 0, cy = 0;
	for (let j=0; j<localPoints.length; j++) {
		cx += localPoints[j].x;
		cy += localPoints[j].y;
	}
	cx = cx / localPoints.length;
	cy = cy / localPoints.length;

	// sum all point delta vectors relative to the centroid
	let sdx = localPoints[0].x - cx;
	let sdy = localPoints[0].y - cy;
	let sdSum = mag(sdx, sdy);
	if (sdSum === 0) {
		return null;
	}
	for (let j=1; j<localPoints.length; j++) {
		let dx = localPoints[j].x - cx;
		let dy = localPoints[j].y - cy;
		if (dot(dx, dy, sdx, sdy) < 0) {
			dx = dx * -1;
			dy = dy * -1;
		}
		sdx += dx;
		sdy += dy;
		sdSum += mag(dx, dy);
	}

	// now that we have a sum vector, we can use its magnitude both to normalize
	// it and to calculate an agreement coefficient.
	const sdMag = mag(sdx, sdy);
	return {
		x: cx,
		y: cy,
		dx: sdx / sdMag,
		dy: sdy / sdMag,
		dSum: sdSum,
		dSumCoeff: sdMag / sdSum
	};
}

/**
 * Computes a line of OK fit (less provably rigorous than best fit) between
 * a set of points.
 */
function computeLineOfDecentFitWithFalloff (center, localPoints, falloff) {

	// sum all point delta vectors relative to the centroid
	const cx = center.x;
	const cy = center.y;
	let sdx = localPoints[0].x - cx;
	let sdy = localPoints[0].y - cy;
	let sdSum = mag(sdx, sdy);
	if (sdSum === 0) {
		return null;
	}
	for (let j=0; j<localPoints.length; j++) {
		let dx = localPoints[j].x - cx;
		let dy = localPoints[j].y - cy;
		const dl = mag(dx, dy);
		const dlF = Math.pow(1 / dl, falloff);
		if (dot(dx, dy, sdx, sdy) < 0) {
			dx = dx * -1;
			dy = dy * -1;
		}
		dx = dx * dlF;
		dy = dy * dlF;
		sdx += dx;
		sdy += dy;
		sdSum += mag(dx, dy);
	}

	// now that we have a sum vector, we can use its magnitude both to normalize
	// it and to calculate an agreement coefficient.
	const sdMag = mag(sdx, sdy);
	return {
		x: cx,
		y: cy,
		dx: sdx / sdMag,
		dy: sdy / sdMag,
		dSum: sdSum,
		dSumCoeff: sdMag / sdSum
	};
}

function updateAllConstructs () {
	const fadeTime = 4;
	state.constructs.forEach(c => {
		c.lifeRemaining--;
		c.a = Math.min(
						Math.min(
							c.aMax,
							c.lifeRemaining / fadeTime
						),
						(c.initialLife - c.lifeRemaining)/ fadeTime
					);
	});
	state.constructs = state.constructs.filter(c => c.lifeRemaining > 0);
}
