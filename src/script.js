import GUI from 'lil-gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import shaders from './shaders/index';
const {
	firefliesFragmentShader,
	firefliesVertexShader,
	portalFragmentShader,
	portalVertexShader,
} = shaders;

/**
 * Base
 */
// Debug
const gui = new GUI();
const debugObject = {
	clearColor: '#201919',
	portalColorStart: '#cf2a2a',
	portalColorEnd: '#f5fffe',
};

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader();

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');

// GLTF loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Textures
 */
const bakedTexture = textureLoader.load('baked.jpg');
bakedTexture.colorSpace = THREE.SRGBColorSpace;
bakedTexture.flipY = false;

/**
 * Material
 */
const bakedMaterial = new THREE.MeshBasicMaterial({
	map: bakedTexture,
});
const poleLightMaterial = new THREE.MeshBasicMaterial({
	color: 0xffffe5,
});
const portalLightMaterial = new THREE.ShaderMaterial({
	vertexShader: portalVertexShader,
	fragmentShader: portalFragmentShader,
	uniforms: {
		uTime: { value: 0 },
		uColorStart: {
			value: new THREE.Color(debugObject.portalColorStart),
		},
		uColorEnd: {
			value: new THREE.Color(debugObject.portalColorEnd),
		},
	},
});

gui.addColor(debugObject, 'portalColorStart').onChange(() => {
	portalLightMaterial.uniforms.uColorStart.value.set(
		debugObject.portalColorStart
	);
});
gui.addColor(debugObject, 'portalColorEnd').onChange(() => {
	portalLightMaterial.uniforms.uColorEnd.value.set(
		debugObject.portalColorEnd
	);
});

/**
 * Model
 */
gltfLoader.load('portal.glb', gltf => {
	// Whole scene
	gltf.scene.children.find(child =>
		child.name.includes('baked')
	).material = bakedMaterial;

	// Pole lights
	gltf.scene.children
		.filter(child => child.name.includes('pole'))
		.forEach(child => (child.material = poleLightMaterial));

	// Portal light
	gltf.scene.children.find(child =>
		child.name.includes('portal')
	).material = portalLightMaterial;

	scene.add(gltf.scene);
});

/**
 * Fireflies
 */
const firefliesGeometry = new THREE.BufferGeometry();

const firefliesCount = 30;
const firefliesPosition = new Float32Array(firefliesCount * 3);
const firefliesScales = new Float32Array(firefliesCount);

for (let i = 0; i < firefliesPosition.length; i++) {
	firefliesPosition[i * 3 + 0] = (Math.random() - 0.5) * 4;
	firefliesPosition[i * 3 + 1] = Math.random() * 1.5;
	firefliesPosition[i * 3 + 2] = (Math.random() - 0.5) * 4;

	firefliesScales[i] = Math.random();
}

firefliesGeometry.setAttribute(
	'position',
	new THREE.BufferAttribute(firefliesPosition, 3)
);
firefliesGeometry.setAttribute(
	'aScale',
	new THREE.BufferAttribute(firefliesScales, 1)
);

const firefliesMaterial = new THREE.ShaderMaterial({
	transparent: true,
	blending: THREE.AdditiveBlending,
	depthWrite: false,
	vertexShader: firefliesVertexShader,
	fragmentShader: firefliesFragmentShader,
	uniforms: {
		uTime: { value: 0 },
		uPixelRatio: {
			value: Math.min(devicePixelRatio, 2),
		},
		uPointSize: { value: 160 },
	},
});
const fireflies = new THREE.Points(
	firefliesGeometry,
	firefliesMaterial
);
scene.add(fireflies);

gui.add(firefliesMaterial.uniforms.uPointSize, 'value')
	.min(0)
	.max(500)
	.step(0.01)
	.name('firefliesSize');

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

window.addEventListener('resize', () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	firefliesMaterial.uniforms.uPixelRatio.value = Math.min(
		devicePixelRatio,
		2
	);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
	45,
	sizes.width / sizes.height,
	0.1,
	100
);
camera.position.x = 4;
camera.position.y = 2;
camera.position.z = 4;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(debugObject.clearColor);

gui.addColor(debugObject, 'clearColor').onChange(() =>
	renderer.setClearColor(debugObject.clearColor)
);

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
	const elapsedTime = clock.getElapsedTime();

	// Update controls
	controls.update();

	// Update fireflies
	firefliesMaterial.uniforms.uTime.value = elapsedTime;
	portalLightMaterial.uniforms.uTime.value = elapsedTime;

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
