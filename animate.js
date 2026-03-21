import * as THREE from "https://cdn.skypack.dev/three@0.134.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/loaders/GLTFLoader.js";

let container, clock, mixer, actions, activeAction, previousAction;
let camera, scene, renderer, model;

const api = { state: "Walking", emotes: "Wave" };
let driftTime = 0;
let animationEnabled = false;
let modelRequested = false;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    100
  );
  camera.position.set(-5.5, 2.8, 8.5);
  camera.lookAt(new THREE.Vector3(0, 2, 0));

  scene = new THREE.Scene();
  scene.background = null;

  clock = new THREE.Clock();

  // lights

  const hemiLight = new THREE.HemisphereLight(0xfaf5e8, 0x9db6c0, 0.95);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff5de, 0.8);
  dirLight.position.set(4, 14, 8);
  scene.add(dirLight);

  const fillLight = new THREE.PointLight(0xb5f0e6, 0.65, 40);
  fillLight.position.set(-6, 4, -3);
  scene.add(fillLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  animationEnabled = shouldAnimateByDefault();
  setAnimationEnabled(animationEnabled);

  window.addEventListener("resize", onWindowResize);

  // stats
  //stats = new Stats();
  //container.appendChild(stats.dom);
  // var msg = new SpeechSynthesisUtterance();
  // var voices = window.speechSynthesis.getVoices();
  // msg.voice = voices[0];
  // msg.text = "Hey there, This is CJ.";
  // window.speechSynthesis.speak(msg);
}

function shouldAnimateByDefault() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = window.innerWidth < 900;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = connection && connection.saveData === true;
  const connectionType = connection && typeof connection.effectiveType === "string" ? connection.effectiveType : "";
  const constrainedNetwork = saveData || connectionType === "slow-2g" || connectionType === "2g" || connectionType === "3g";

  return !reducedMotion && !isSmallScreen && !constrainedNetwork;
}

function loadModelIfNeeded() {
  if (modelRequested) {
    return;
  }

  modelRequested = true;
  const loader = new GLTFLoader();

  loader.load(
    "./RobotExpressive.glb",
    function (gltf) {
      model = gltf.scene;
      model.position.set(2.5, -1.6, -0.8);
      model.rotation.y = -0.35;
      model.scale.set(1.45, 1.45, 1.45);
      scene.add(model);

      createGUI(model, gltf.animations);
    },
    undefined,
    function (e) {
      console.error(e);
    }
  );
}

function setAnimationEnabled(enabled) {
  animationEnabled = enabled;
  container.style.display = enabled ? "block" : "none";

  if (enabled) {
    loadModelIfNeeded();
    clock.getDelta();
  }
}

function createGUI(model, animations) {
  const states = [
    "Idle",
    "Walking",
    "Running",
    "Dance",
    "Death",
    "Sitting",
    "Standing",
  ];
  const emotes = ["Jump", "Yes", "No", "Wave", "Punch", "ThumbsUp"];

  // gui = new GUI();

  mixer = new THREE.AnimationMixer(model);

  actions = {};

  for (let i = 0; i < animations.length; i++) {
    const clip = animations[i];
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;

    if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
  }

  // states

  // const statesFolder = gui.addFolder( 'States' );

  // const clipCtrl = statesFolder.add( api, 'state' ).options( states );

  // clipCtrl.onChange( function () {

  // 	fadeToAction( api.state, 0.5 );

  // } );

  // statesFolder.open();

  // emotes

  // const emoteFolder = gui.addFolder( 'Emotes' );

  function createEmoteCallback(name) {
    api[name] = function () {
      fadeToAction(name, 0.2);

      mixer.addEventListener("finished", restoreState);
    };

    // 	emoteFolder.add( api, name );
  }

  function restoreState() {
    mixer.removeEventListener("finished", restoreState);

    fadeToAction(api.state, 0.2);
  }

  for (let i = 0; i < emotes.length; i++) {
    createEmoteCallback(emotes[i]);
  }

  // emoteFolder.open();

  // expressions

  // face = model.getObjectByName( 'Head_4' );

  // const expressions = Object.keys( face.morphTargetDictionary );
  // const expressionFolder = gui.addFolder( 'Expressions' );

  // for ( let i = 0; i < expressions.length; i ++ ) {

  // 	expressionFolder.add( face.morphTargetInfluences, i, 0, 1, 0.01 ).name( expressions[ i ] );

  // }
  activeAction = actions["Idle"] || actions["Walking"];
  activeAction.play();

  //	expressionFolder.open();
}

function fadeToAction(name, duration) {
  previousAction = activeAction;
  activeAction = actions[name];

  if (previousAction !== activeAction) {
    previousAction.fadeOut(duration);
  }

  activeAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  setAnimationEnabled(shouldAnimateByDefault());
}

//

function animate() {
  requestAnimationFrame(animate);
  if (!animationEnabled) {
    return;
  }

  const dt = clock.getDelta();
  driftTime += dt;

  if (mixer) mixer.update(dt);

  if (model) {
    model.position.y = -1.6 + Math.sin(driftTime * 1.1) * 0.06;
    model.rotation.y = -0.35 + Math.sin(driftTime * 0.45) * 0.08;
  }

  renderer.render(scene, camera);

  // stats.update();
}
