let scene, camera, renderer, controls, particleSystem;
let stlModel;
let particleThickness = 0.1;
let stlScale = 1;
let particles = [];

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  document.getElementById('upload').addEventListener('change', handleFileUpload);
  document.getElementById('scale').addEventListener('input', handleScaleChange);
  document.getElementById('thickness').addEventListener('input', handleThicknessChange);

  createParticleSystem();
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const contents = e.target.result;
    const loader = new THREE.STLLoader();
    const geometry = loader.parse(contents);

    if (stlModel) {
      scene.remove(stlModel);
    }

    stlModel = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x606060 }));
    stlModel.scale.set(stlScale, stlScale, stlScale);
    stlModel.position.set(0, -0.5, 0);
    scene.add(stlModel);

    controls.reset();
    fitCameraToObject(camera, stlModel, 1.5);

    updateParticleSystem();
  };

  reader.readAsArrayBuffer(file);
}

function handleScaleChange(event) {
  stlScale = parseFloat(event.target.value);
  if (stlModel) {
    stlModel.scale.set(stlScale, stlScale, stlScale);
    updateParticleSystem();
  }
}

function handleThicknessChange(event) {
  particleThickness = parseFloat(event.target.value);
  if (particleSystem) {
    particleSystem.material.size = particleThickness;
  }
}

function createParticleSystem() {
  const particleCount = 1000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = Math.random() * 10 - 5;
    positions[i * 3 + 1] = Math.random() * 10 - 5;
    positions[i * 3 + 2] = Math.random() * 10 - 5;

    particles.push({
      velocity: new THREE.Vector3(Math.random() * 0.1 + 0.05, 0, 0) // Parçacıklar soldan sağa hareket eder
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: particleThickness });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

function updateParticleSystem() {
  if (!stlModel) return;

  const boundingBox = new THREE.Box3().setFromObject(stlModel);
  const size = boundingBox.getSize(new THREE.Vector3());

  const particleCount = particleSystem.geometry.attributes.position.count;
  const positions = particleSystem.geometry.attributes.position.array;

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = Math.random() * size.x - size.x / 2;
    positions[i * 3 + 1] = Math.random() * size.y - size.y / 2;
    positions[i * 3 + 2] = Math.random() * size.z - size.z / 2;
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);

  const positions = particleSystem.geometry.attributes.position.array;
  const particleCount = positions.length / 3;
  const boundingBox = stlModel ? new THREE.Box3().setFromObject(stlModel) : null;

  for (let i = 0; i < particleCount; i++) {
    const index = i * 3;

    positions[index] += particles[i].velocity.x;
    positions[index + 1] += particles[i].velocity.y;
    positions[index + 2] += particles[i].velocity.z;

    if (boundingBox) {
      if (positions[index] > boundingBox.max.x) {
        positions[index] = boundingBox.min.x;
      }
      if (positions[index + 1] < boundingBox.min.y || positions[index + 1] > boundingBox.max.y) {
        particles[i].velocity.y *= -1;
      }
      if (positions[index + 2] < boundingBox.min.z || positions[index + 2] > boundingBox.max.z) {
        particles[i].velocity.z *= -1;
      }
    }
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

function fitCameraToObject(camera, object, offset) {
  offset = offset || 1.25;
  const boundingBox = new THREE.Box3();
  boundingBox.setFromObject(object);

  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());

  const startDistance = center.distanceTo(camera.position);
  const endDistance = offset * Math.max(size.x, size.y, size.z);

  const directionVector = new THREE.Vector3().subVectors(camera.position, center).normalize();

  camera.position.copy(directionVector.multiplyScalar(endDistance).add(center));
  camera.lookAt(center);
}
