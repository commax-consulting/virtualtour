import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

let scene, camera, renderer;
let isCalibrated = false;
let initialQuaternion = new THREE.Quaternion();
let currentQuaternion = new THREE.Quaternion();
let smoothQuaternion = new THREE.Quaternion();

function applyQuaternionSmoothing(current, target, smoothingFactor = 0.1) {
    return current.slerp(target, smoothingFactor);
}

function handleOrientation(event) {
    if (!isCalibrated) {
        // Initiale Quaternion basierend auf Sensorwerten setzen
        const initialEuler = new THREE.Euler(
            THREE.MathUtils.degToRad(event.beta || 0),
            THREE.MathUtils.degToRad(event.alpha || 0),
            THREE.MathUtils.degToRad(event.gamma || 0),
            'YXZ'
        );
        initialQuaternion.setFromEuler(initialEuler);
        isCalibrated = true;
        console.log('Initial calibration complete.');
    }

    // Aktuelle Quaternion aus den Sensorwerten berechnen
    const currentEuler = new THREE.Euler(
        THREE.MathUtils.degToRad(event.beta || 0),
        THREE.MathUtils.degToRad(event.alpha || 0),
        THREE.MathUtils.degToRad(event.gamma || 0),
        'YXZ'
    );
    currentQuaternion.setFromEuler(currentEuler);

    // Stabilisierung: Quaternion relativ zur Initialen berechnen
    const relativeQuaternion = initialQuaternion.clone().invert().multiply(currentQuaternion);

    // Bewegung glätten
    smoothQuaternion = applyQuaternionSmoothing(smoothQuaternion, relativeQuaternion);

    // Kamera orientieren
    camera.quaternion.copy(smoothQuaternion);
}

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('test.jpg', () => {
        console.log('Texture loaded successfully!');
    });

    const geometry = new THREE.SphereGeometry(500, 128, 128);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    window.addEventListener('deviceorientation', handleOrientation);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('startButton').addEventListener('click', () => {
    if (window.innerWidth <= window.innerHeight) {
        alert('Bitte legen Sie Ihr Gerät ins Querformat, um fortzufahren.');
        return;
    }

    console.log('Querformat erkannt.');

    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then((permissionState) => {
                if (permissionState === 'granted') {
                    init();
                    animate();
                    document.getElementById('startButton').style.display = 'none';
                } else {
                    alert('Permission denied for motion sensors.');
                }
            })
            .catch(console.error);
    } else {
        init();
        animate();
        document.getElementById('startButton').style.display = 'none';
    }
});