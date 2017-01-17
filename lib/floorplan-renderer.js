"use strict";
const three = require("three");
const materials = require("./floorplan-renderer-materials");
const KeyDownStateResolver = require("./keydown-state");

const UP = new three.Vector3(0,0,1);

/**
 * Renderer for Social Tables floorplan data.
 */
class FloorplanRenderer {
	constructor ({ domElement, keyRouter }) {

		// set up renderer, append to target dom element
		this.container = domElement;
		this.scene = new three.Scene();
		this.camera = new three.OrthographicCamera(
			window.innerWidth  / -2,
			window.innerWidth  /  2,
			window.innerHeight / -2,
			window.innerHeight /  2,
			-500,
			1000
		);

		this.camera.lookAt(new three.Vector3().sub(UP));
		this.camera.position.add(UP);
		this.renderer = new three.WebGLRenderer();
		this.renderer.setClearColor( 0x222222 );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.container.appendChild( this.renderer.domElement );

		// raycaster for mouse position tracking
		this.raycaster = new three.Raycaster();

		// respond to resize, scroll-to-zoom
		window.addEventListener("resize", this._onWindowResize.bind(this), false);
		window.addEventListener("mousewheel", this._onDocumentMouseWheel.bind(this), false);

		// stateful key down-ness
		this.keyDownState = new KeyDownStateResolver(500);

		// panning options
		this.panningOptions = { speed: 1 };

		// routing for key events from parent window
		keyRouter.addRegion("renderer", domElement);
		keyRouter.setFocus("renderer");
		keyRouter.addEventListener("renderer", "keydown", this.keyDownState.getKeydownHandler());
		keyRouter.addEventListener("renderer", "keyup", this.keyDownState.getKeyupHandler());

		// handle mouse motion inside the target dom element
		this.renderer.domElement.addEventListener( 'mousemove', this._onDocumentMouseMove.bind(this), false );

		// k/v for onscreen entities
		this.entities = {};
		this.materials = {};
	}
	beginRendering () {
		const animate = () => {
			requestAnimationFrame(animate);
			this._handleKeyDownState();
			this.renderFrame();
		};
		animate();
	}
	renderFrame () {
		this.renderer.render(this.scene, this.camera);
	}
	_onWindowResize () {
		this.camera.left   = window.innerWidth / -2;
		this.camera.right  = window.innerWidth /  2;
		this.camera.top    = window.innerHeight / -2;
		this.camera.bottom = window.innerHeight /  2;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}
	_onDocumentMouseWheel (event) {
		this.camera.zoom += event.wheelDeltaY * 0.01;
	    this.camera.zoom = Math.max(this.camera.zoom, 0.1);
		this.camera.updateProjectionMatrix();
	}
	_onDocumentMouseMove (event) {
		event.preventDefault();
		const mousePosition = new three.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
		this.raycaster.setFromCamera(mousePosition, this.camera);
		const dragPlane = new three.Plane(UP, 1);
		const intersect = this.raycaster.ray.intersectPlane(dragPlane);
		if (intersect) {
			if (this._onMouseMoveCoordinates) {
				this._onMouseMoveCoordinates(intersect);
			}
		}
	}
	_handleKeyDownState (e) {

		const speed = this.panningOptions.speed;
		let movedCamera = false;

		if (this.keyDownState.isKeyDown("ArrowUp")) {
			this.camera.top    -= speed;
			this.camera.bottom -= speed;
			movedCamera = true;
		}
		if (this.keyDownState.isKeyDown("ArrowDown")) {
			this.camera.top    += speed;
			this.camera.bottom += speed;
			movedCamera = true;
		}
		if (this.keyDownState.isKeyDown("ArrowLeft")) {
			this.camera.left  -= speed;
			this.camera.right -= speed;
			movedCamera = true;
		}
		if (this.keyDownState.isKeyDown("ArrowRight")) {
			this.camera.left  += speed;
			this.camera.right += speed;
			movedCamera = true;
		}
		if (this.keyDownState.isKeyDown("w")) {
			this.camera.zoom += speed/100;
			this.camera.zoom = Math.max(this.camera.zoom, 0.1);
			movedCamera = true;
		}
		if (this.keyDownState.isKeyDown("s")) {
			this.camera.zoom -= speed/100;
			movedCamera = true;
		}
		if (movedCamera) {
			this.camera.updateProjectionMatrix();
		}
	}
	onMouseMoveCoordinates (thunk) {
		this._onMouseMoveCoordinates = thunk;
	}
	zoomToFit ({ padding=20 }={}) {
		const bbox = new three.Box3().setFromObject(this.scene);
		const bboxSize = bbox.max.clone().sub(bbox.min);
		const fitWidth = bboxSize.x;
		const fitHeight = bboxSize.y;
		this.camera.zoom = Math.min(
			(window.innerWidth  - padding * 2) / fitWidth,
			(window.innerHeight - padding * 2) / fitHeight
		);
		this.panningOptions.speed = Math.max(fitWidth, fitHeight) / 200;
		bbox.getCenter(this.camera.position);
		this.camera.updateProjectionMatrix();
	}
	addBoundariesRaw (id, lines) {
		this.materials.lines || (this.materials.lines = materials.perimeterLines());
		const obj = new three.Object3D();
		const objGeom = new three.Geometry();
		lines.forEach(l => objGeom.vertices.push(
			new three.Vector3(l[0].x, l[0].y, 0),
			new three.Vector3(l[1].x, l[1].y, 0)
		));
		objGeom.computeLineDistances();
		obj.add(new three.LineSegments(objGeom, this.materials.lines));
		this.scene.add(obj);
		this.entities[id] = obj;
	}
}

module.exports = FloorplanRenderer;
