import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MascotState } from '../types';
import { soundEngine } from '../services/synthService';

interface PopboyMascot3DProps {
  state: MascotState;
  activeAccentColor?: string;
  currentSongTitle?: string;
  onBoop?: () => void;
}

export const PopboyMascot3D: React.FC<PopboyMascot3DProps> = ({
  state,
  activeAccentColor = '#F5B041',
  currentSongTitle,
  onBoop,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<MascotState>(state);
  const colorRef = useRef<string>(activeAccentColor);
  const boopImpulseRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    colorRef.current = activeAccentColor;
  }, [activeAccentColor]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 390;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#131620');
    scene.fog = new THREE.FogExp2('#131620', 0.045);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 6.7);
    camera.lookAt(0, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // ============================================================================
    // 1. WARM RETRO STUDIO LIGHTING (Hummit Honey Amber & Sunset Coral Ambiance)
    // ============================================================================
    const ambientLight = new THREE.AmbientLight('#2e2836', 1.45);
    scene.add(ambientLight);

    // Warm Golden Equalizer Back-Glow
    const eqGlowLight = new THREE.PointLight('#FFB300', 4.5, 11);
    eqGlowLight.position.set(0, 1.45, -1.3);
    scene.add(eqGlowLight);

    // Warm Key Light on Teddy Bear Face & Fur
    const keyLight = new THREE.SpotLight('#FFE4B5', 4.2, 16, Math.PI / 3, 0.55);
    keyLight.position.set(1.8, 3.6, 4.8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Warm Amber Left Fill Light (near left analog synth)
    const leftSynthLight = new THREE.PointLight('#F5B041', 2.4, 9);
    leftSynthLight.position.set(-2.8, 1.2, 1.8);
    scene.add(leftSynthLight);

    // Warm Coral Rim Light
    const coralRimLight = new THREE.PointLight('#FF5722', 2.0, 9);
    coralRimLight.position.set(2.8, 1.4, 1.5);
    scene.add(coralRimLight);

    // ============================================================================
    // 2. STUDIO ROOM ARCHITECTURE & BACK-WALL GOLDEN NEON EQUALIZER (Hummit Style)
    // ============================================================================
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // Dark Navy-Charcoal Acoustic Studio Wall
    const backWallMat = new THREE.MeshStandardMaterial({
      color: '#181c28',
      roughness: 0.9,
      metalness: 0.08,
    });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), backWallMat);
    backWall.position.set(0, 1.0, -2.2);
    roomGroup.add(backWall);

    // Warm Hardwood Studio Floor
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#221814',
      roughness: 0.75,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.65, 0);
    roomGroup.add(floor);

    // Glowing Golden Neon Equalizer Matrix on the Back Wall (Behind the Bear)
    const wallEqGroup = new THREE.Group();
    wallEqGroup.position.set(0, 1.38, -2.08);
    roomGroup.add(wallEqGroup);

    const eqColumnCount = 13;
    const eqMaxSegments = 9;
    const eqBaseCounts = [3, 4, 7, 5, 6, 8, 9, 7, 5, 8, 6, 4, 3];
    const eqSegmentMeshes: THREE.Mesh[][] = [];

    const eqGlowMat = new THREE.MeshStandardMaterial({
      color: '#FFB300',
      emissive: '#FF9800',
      emissiveIntensity: 2.3,
      roughness: 0.2,
    });
    const eqDimMat = new THREE.MeshStandardMaterial({
      color: '#2d2419',
      emissive: '#3d2910',
      emissiveIntensity: 0.2,
      roughness: 0.6,
    });

    for (let col = 0; col < eqColumnCount; col++) {
      const colMeshes: THREE.Mesh[] = [];
      const xPos = (col - (eqColumnCount - 1) / 2) * 0.28;
      for (let seg = 0; seg < eqMaxSegments; seg++) {
        const yPos = seg * 0.115;
        const barGeo = new THREE.BoxGeometry(0.21, 0.072, 0.035);
        const barMesh = new THREE.Mesh(
          barGeo,
          seg < eqBaseCounts[col] ? eqGlowMat : eqDimMat
        );
        barMesh.position.set(xPos, yPos, 0);
        wallEqGroup.add(barMesh);
        colMeshes.push(barMesh);
      }
      eqSegmentMeshes.push(colMeshes);
    }

    // Back Wooden Console Shelf (holds headphone stand & turntable behind armchair)
    const walnutWoodMat = new THREE.MeshStandardMaterial({
      color: '#5a351d',
      roughness: 0.65,
      metalness: 0.1,
    });
    const backConsole = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 1.1), walnutWoodMat);
    backConsole.position.set(-0.6, -0.18, -1.35);
    roomGroup.add(backConsole);

    // Curved Wooden Headphone Stand (Left-center background, matching reference)
    const hpStandGroup = new THREE.Group();
    hpStandGroup.position.set(-1.05, -0.1, -1.2);
    roomGroup.add(hpStandGroup);

    const hpBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 20), walnutWoodMat);
    hpStandGroup.add(hpBase);

    const hpArch = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 12, 24, Math.PI), walnutWoodMat);
    hpArch.position.set(0, 0.26, 0);
    hpStandGroup.add(hpArch);

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#23252c',
      roughness: 0.35,
      metalness: 0.75,
    });
    const earCupLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), darkMetalMat);
    earCupLeft.rotation.z = Math.PI / 2;
    earCupLeft.position.set(-0.2, 0.24, 0);
    hpStandGroup.add(earCupLeft);

    const earCupRight = earCupLeft.clone();
    earCupRight.position.set(0.2, 0.24, 0);
    hpStandGroup.add(earCupRight);

    // Vintage Turntable on Back Console
    const turntablePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.68), darkMetalMat);
    turntablePlinth.position.set(-0.15, -0.06, -1.25);
    roomGroup.add(turntablePlinth);

    const platterRecord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24),
      new THREE.MeshStandardMaterial({ color: '#111115', roughness: 0.25, metalness: 0.6 })
    );
    platterRecord.position.set(-0.15, 0.0, -1.25);
    roomGroup.add(platterRecord);

    // ============================================================================
    // 3. LEFT VINTAGE WOOD-PANEL ANALOG SYNTHESIZER & DESK
    // ============================================================================
    const leftSynthGroup = new THREE.Group();
    leftSynthGroup.position.set(-2.35, -0.22, 0.15);
    leftSynthGroup.rotation.y = 0.38;
    roomGroup.add(leftSynthGroup);

    // Desk surface under left synth
    const leftDesk = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.22, 1.15), walnutWoodMat);
    leftDesk.position.set(0, -0.18, 0);
    leftSynthGroup.add(leftDesk);

    // Angled Wood-Frame Analog Synth Body
    const synthChassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.85), walnutWoodMat);
    synthChassis.position.set(0, 0.15, -0.05);
    synthChassis.rotation.x = 0.28;
    leftSynthGroup.add(synthChassis);

    const synthPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.43, 0.65),
      darkMetalMat
    );
    synthPanel.position.set(0, 0.17, -0.08);
    synthPanel.rotation.x = 0.28;
    leftSynthGroup.add(synthPanel);

    // White Piano Keys on Left Synth
    const keyMatWhite = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.3 });
    for (let k = 0; k < 14; k++) {
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.05, 0.24), keyMatWhite);
      keyMesh.position.set(-0.56 + k * 0.086, 0.08, 0.32);
      leftSynthGroup.add(keyMesh);
    }

    // Glowing Amber LEDs on Left Synth
    const amberLedMat = new THREE.MeshStandardMaterial({
      color: '#FFB300',
      emissive: '#FF9800',
      emissiveIntensity: 1.8,
    });
    for (let n = 0; n < 6; n++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.03), amberLedMat);
      led.position.set(-0.45 + n * 0.18, 0.35, -0.12);
      leftSynthGroup.add(led);
    }

    // ============================================================================
    // 4. RIGHT DOUBLE-TIER ANALOG SYNTH RACK & STACK OF LP VINYL RECORDS
    // ============================================================================
    const rightSynthGroup = new THREE.Group();
    rightSynthGroup.position.set(2.35, 0.05, -0.05);
    rightSynthGroup.rotation.y = -0.42;
    roomGroup.add(rightSynthGroup);

    // Lower Synth Tier
    const lowerSynth = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.25, 0.82), walnutWoodMat);
    lowerSynth.position.set(0, -0.05, 0.1);
    lowerSynth.rotation.x = 0.15;
    rightSynthGroup.add(lowerSynth);

    const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.26, 0.55), darkMetalMat);
    lowerPanel.position.set(0, -0.03, 0.02);
    lowerPanel.rotation.x = 0.15;
    rightSynthGroup.add(lowerPanel);

    for (let k = 0; k < 15; k++) {
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.045, 0.22), keyMatWhite);
      keyMesh.position.set(-0.6 + k * 0.086, -0.02, 0.42);
      rightSynthGroup.add(keyMesh);
    }

    // Upper Synth Tier
    const upperSynth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.72), walnutWoodMat);
    upperSynth.position.set(0, 0.62, -0.15);
    upperSynth.rotation.x = 0.36;
    rightSynthGroup.add(upperSynth);

    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.29, 0.48), darkMetalMat);
    upperPanel.position.set(0, 0.64, -0.2);
    upperPanel.rotation.x = 0.36;
    rightSynthGroup.add(upperPanel);

    for (let k = 0; k < 13; k++) {
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.2), keyMatWhite);
      keyMesh.position.set(-0.52 + k * 0.086, 0.52, 0.14);
      upperSynth.rotation.x = 0.36;
      rightSynthGroup.add(keyMesh);
    }

    // Stack of LP Vinyl Sleeves + Top Vinyl Record in Front-Right (matching Hummit mockup)
    const lpStackGroup = new THREE.Group();
    lpStackGroup.position.set(1.92, -1.05, 1.35);
    lpStackGroup.rotation.y = -0.28;
    roomGroup.add(lpStackGroup);

    const sleeveColors = ['#d9822b', '#2b3442', '#b85d3b', '#e2c499', '#3a2d32', '#d49a45', '#242936'];
    for (let s = 0; s < 14; s++) {
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: sleeveColors[s % sleeveColors.length],
        roughness: 0.6,
      });
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.032, 1.12), sleeveMat);
      sleeve.position.set(
        (Math.sin(s * 2.1) * 0.02),
        s * 0.034,
        (Math.cos(s * 1.7) * 0.02)
      );
      sleeve.rotation.y = Math.sin(s) * 0.04;
      lpStackGroup.add(sleeve);
    }

    // Top Black LP Vinyl Disc with Warm Coral/Orange Center Label
    const topVinylDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.018, 32),
      new THREE.MeshStandardMaterial({ color: '#101014', roughness: 0.22, metalness: 0.65 })
    );
    topVinylDisc.position.set(0, 14 * 0.034 + 0.02, 0);
    lpStackGroup.add(topVinylDisc);

    const topVinylLabel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.022, 24),
      new THREE.MeshStandardMaterial({
        color: '#FF5722',
        emissive: '#FF5722',
        emissiveIntensity: 0.35,
      })
    );
    topVinylLabel.position.set(0, 14 * 0.034 + 0.022, 0);
    lpStackGroup.add(topVinylLabel);

    // ============================================================================
    // 5. COZY MAUVE VELVET STUDIO ARMCHAIR (Center Stage)
    // ============================================================================
    const armchairGroup = new THREE.Group();
    armchairGroup.position.set(0.18, -0.78, 0.42);
    scene.add(armchairGroup);

    const velvetMat = new THREE.MeshStandardMaterial({
      color: '#6b4e57',
      roughness: 0.85,
      metalness: 0.05,
    });
    const velvetDarkMat = new THREE.MeshStandardMaterial({
      color: '#4e373f',
      roughness: 0.9,
      metalness: 0.04,
    });

    // Seat Cushion
    const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.32, 1.35), velvetMat);
    seatCushion.position.set(0, -0.22, 0.05);
    armchairGroup.add(seatCushion);

    // Curved Backrest
    const chairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.82, 1.15, 24, 1, false, Math.PI * 0.65, Math.PI * 0.7),
      velvetDarkMat
    );
    chairBack.position.set(0, 0.25, -0.05);
    armchairGroup.add(chairBack);

    // Left & Right Plush Armrests
    const leftArmrest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.25, 16), velvetMat);
    leftArmrest.rotation.x = Math.PI / 2;
    leftArmrest.position.set(-0.74, 0.06, 0.08);
    armchairGroup.add(leftArmrest);

    const rightArmrest = leftArmrest.clone();
    rightArmrest.position.set(0.74, 0.06, 0.08);
    armchairGroup.add(rightArmrest);

    // Wooden Chair Legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.45, 10);
    const legPositions = [
      [-0.62, -0.55, 0.5],
      [0.62, -0.55, 0.5],
      [-0.62, -0.55, -0.45],
      [0.62, -0.55, -0.45],
    ];
    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, walnutWoodMat);
      leg.position.set(lx, ly, lz);
      armchairGroup.add(leg);
    });

    // ============================================================================
    // 6. HUMMIT TEDDY BEAR MASCOT (Sitting in Armchair, Reactive to Voice & Music)
    // ============================================================================
    const bearRoot = new THREE.Group();
    bearRoot.position.set(0.18, -0.42, 0.46);
    scene.add(bearRoot);

    const honeyFurMat = new THREE.MeshStandardMaterial({
      color: '#d8a572',
      roughness: 0.92,
      metalness: 0.02,
    });
    const creamSnoutMat = new THREE.MeshStandardMaterial({
      color: '#f5e4cd',
      roughness: 0.85,
      metalness: 0.02,
    });
    const innerEarMat = new THREE.MeshStandardMaterial({
      color: '#b87f4c',
      roughness: 0.9,
      metalness: 0.02,
    });
    const noseChocolateMat = new THREE.MeshStandardMaterial({
      color: '#3d2214',
      roughness: 0.35,
      metalness: 0.1,
    });
    const eyeBlackMat = new THREE.MeshStandardMaterial({
      color: '#110d0a',
      roughness: 0.12,
      metalness: 0.35,
    });

    // Plump Teddy Torso
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 32), honeyFurMat);
    torso.scale.set(1.06, 1.02, 0.92);
    torso.position.set(0, 0.18, 0);
    bearRoot.add(torso);

    // Soft Belly Patch
    const bellyPatch = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 24), creamSnoutMat);
    bellyPatch.scale.set(0.95, 0.95, 0.35);
    bellyPatch.position.set(0, 0.15, 0.5);
    bearRoot.add(bellyPatch);

    // Chubby Sitting Legs Extending Forward onto Armchair Cushion
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.34, -0.22, 0.35);
    bearRoot.add(leftLegGroup);

    const legThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.52, 20), honeyFurMat);
    legThigh.rotation.x = Math.PI / 2 - 0.18;
    leftLegGroup.add(legThigh);

    const leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 24), honeyFurMat);
    leftFoot.scale.set(0.95, 1.18, 0.78);
    leftFoot.position.set(0, -0.02, 0.3);
    leftLegGroup.add(leftFoot);

    const leftFootPad = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), innerEarMat);
    leftFootPad.scale.set(0.88, 1.08, 0.3);
    leftFootPad.position.set(0, -0.02, 0.46);
    leftLegGroup.add(leftFootPad);

    const rightLegGroup = leftLegGroup.clone();
    rightLegGroup.position.set(0.34, -0.22, 0.35);
    bearRoot.add(rightLegGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.98, 0.08);
    bearRoot.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.64, 36, 36), honeyFurMat);
    headMesh.scale.set(1.12, 0.98, 0.98);
    headGroup.add(headMesh);

    // Fluffy Cheeks
    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), honeyFurMat);
    leftCheek.position.set(-0.36, -0.1, 0.26);
    headGroup.add(leftCheek);

    const rightCheek = leftCheek.clone();
    rightCheek.position.set(0.36, -0.1, 0.26);
    headGroup.add(rightCheek);

    // Creamy-White Muzzle / Snout
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 28), creamSnoutMat);
    snout.scale.set(1.22, 0.92, 0.88);
    snout.position.set(0, -0.11, 0.54);
    headGroup.add(snout);

    // Chocolate Oval Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 24), noseChocolateMat);
    nose.scale.set(1.38, 0.92, 0.82);
    nose.position.set(0, -0.03, 0.77);
    headGroup.add(nose);

    // Philtrum & Warm Smile Mouth
    const philtrum = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.1, 0.02),
      noseChocolateMat
    );
    philtrum.position.set(0, -0.12, 0.76);
    headGroup.add(philtrum);

    const mouthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 18, 18),
      new THREE.MeshStandardMaterial({ color: '#3b1c14', roughness: 0.5 })
    );
    mouthMesh.scale.set(1.35, 0.35, 0.5);
    mouthMesh.position.set(0, -0.2, 0.73);
    headGroup.add(mouthMesh);

    // Glossy Button Eyes + Catchlights
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 20), eyeBlackMat);
    leftEye.position.set(-0.18, 0.11, 0.59);
    headGroup.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.set(0.18, 0.11, 0.59);
    headGroup.add(rightEye);

    const specMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const leftSpec = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), specMat);
    leftSpec.position.set(-0.16, 0.13, 0.65);
    headGroup.add(leftSpec);

    const rightSpec = leftSpec.clone();
    rightSpec.position.set(0.2, 0.13, 0.65);
    headGroup.add(rightSpec);

    // Flapping Teddy Ears
    const leftEarPivot = new THREE.Group();
    leftEarPivot.position.set(-0.48, 0.44, -0.02);
    leftEarPivot.rotation.z = 0.32;
    headGroup.add(leftEarPivot);

    const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 24), honeyFurMat);
    earOuter.scale.set(1.0, 1.05, 0.5);
    leftEarPivot.add(earOuter);

    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), innerEarMat);
    earInner.scale.set(0.95, 1.0, 0.35);
    earInner.position.set(0, -0.01, 0.09);
    leftEarPivot.add(earInner);

    const rightEarPivot = new THREE.Group();
    rightEarPivot.position.set(0.48, 0.44, -0.02);
    rightEarPivot.rotation.z = -0.32;
    headGroup.add(rightEarPivot);
    rightEarPivot.add(earOuter.clone());
    const rightInner = earInner.clone();
    rightEarPivot.add(rightInner);

    // Left Arm (resting on velvet armrest / waving when singing)
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.56, 0.36, 0.08);
    bearRoot.add(leftArmPivot);

    const leftArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.19, 0.62, 20),
      honeyFurMat
    );
    leftArmMesh.position.set(-0.1, -0.22, 0.18);
    leftArmMesh.rotation.z = 0.25;
    leftArmMesh.rotation.x = -0.55;
    leftArmPivot.add(leftArmMesh);

    const leftPaw = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 20), honeyFurMat);
    leftPaw.position.set(-0.16, -0.44, 0.35);
    leftArmPivot.add(leftPaw);

    // Right Arm (resting on right velvet armrest + holding studio mic when active)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.56, 0.36, 0.08);
    bearRoot.add(rightArmPivot);

    const rightArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.19, 0.62, 20),
      honeyFurMat
    );
    rightArmMesh.position.set(0.1, -0.22, 0.18);
    rightArmMesh.rotation.z = -0.25;
    rightArmMesh.rotation.x = -0.55;
    rightArmPivot.add(rightArmMesh);

    const rightPaw = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 20), honeyFurMat);
    rightPaw.position.set(0.16, -0.44, 0.35);
    rightArmPivot.add(rightPaw);

    // Warm Golden Vintage Studio Microphone in Right Paw
    const micGroup = new THREE.Group();
    micGroup.position.set(0.1, -0.34, 0.48);
    micGroup.rotation.set(0.55, -0.25, 0.35);
    rightArmPivot.add(micGroup);

    const micHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.026, 0.32, 14),
      darkMetalMat
    );
    micGroup.add(micHandle);

    const micCapsule = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 18, 18),
      new THREE.MeshStandardMaterial({
        color: '#F5B041',
        roughness: 0.25,
        metalness: 0.85,
        emissive: '#F5B041',
        emissiveIntensity: 0.25,
      })
    );
    micCapsule.scale.set(1, 1.25, 1);
    micCapsule.position.y = 0.2;
    micGroup.add(micCapsule);

    // Pointer interaction
    let targetMouseX = 0;
    let targetMouseY = 0;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = Math.max(-1, Math.min(1, nx));
      targetMouseY = Math.max(-1, Math.min(1, ny));
    };
    container.addEventListener('pointermove', onPointerMove);

    // ============================================================================
    // 7. ANIMATION LOOP (Real-Time Equalizer Wall + Ear Flap + Vocal Lip-Sync)
    // ============================================================================
    const freqData = new Uint8Array(64);
    let clock = 0;
    let animFrameId = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      clock += 0.04;

      const avgEnergy = soundEngine.getFrequencyData(freqData);
      const normEnergy = Math.min(1, avgEnergy / 128);
      const currentState = stateRef.current;

      if (boopImpulseRef.current > 0.01) {
        boopImpulseRef.current *= 0.88;
      } else {
        boopImpulseRef.current = 0;
      }

      // Spin LP records gently
      platterRecord.rotation.y += 0.025;
      topVinylDisc.rotation.y += currentState === 'singing' || currentState === 'listening' ? 0.04 : 0.008;

      // Animate Back-Wall Golden Neon Equalizer
      for (let col = 0; col < eqColumnCount; col++) {
        const binVal = (freqData[(col * 3) % 48] || 0) / 255;
        let activeLevel = eqBaseCounts[col];

        if (currentState === 'listening' || currentState === 'singing' || currentState === 'celebrating') {
          const wave = Math.sin(clock * 3.6 + col * 0.65) * 0.5 + 0.5;
          activeLevel = Math.max(
            2,
            Math.min(eqMaxSegments, Math.round(binVal * 8 + wave * 4 + normEnergy * 3))
          );
        } else if (currentState === 'thinking') {
          const scan = Math.sin(clock * 5.0 - col * 0.55) * 0.5 + 0.5;
          activeLevel = Math.max(2, Math.round(scan * eqMaxSegments));
        } else {
          const gentle = Math.sin(clock * 1.4 + col * 0.45) * 1.2;
          activeLevel = Math.max(2, Math.min(eqMaxSegments, Math.round(eqBaseCounts[col] + gentle)));
        }

        const colMeshes = eqSegmentMeshes[col];
        for (let seg = 0; seg < eqMaxSegments; seg++) {
          colMeshes[seg].material = seg < activeLevel ? eqGlowMat : eqDimMat;
        }
      }

      // Bear Head & Ear Flapping Animation
      const earFlapSpeed =
        currentState === 'listening' || currentState === 'singing' || currentState === 'celebrating'
          ? 4.6
          : 1.8;
      const earFlapAmp =
        (currentState === 'Idle' as unknown ? 0.08 : 0.14) +
        normEnergy * 0.28 +
        boopImpulseRef.current * 0.45;

      leftEarPivot.rotation.z = 0.32 + Math.sin(clock * earFlapSpeed) * earFlapAmp;
      rightEarPivot.rotation.z = -0.32 - Math.sin(clock * earFlapSpeed) * earFlapAmp;

      // Bear Body Bounce & Arm Motion
      if (currentState === 'listening') {
        bearRoot.position.y = -0.42 + Math.sin(clock * 3.0) * 0.03 + normEnergy * 0.06;
        headGroup.rotation.y = targetMouseX * 0.25 + Math.sin(clock * 2.0) * 0.1;
        headGroup.rotation.z = Math.sin(clock * 2.6) * 0.06;
        rightArmPivot.rotation.x = -0.48 - normEnergy * 0.25;
        rightArmPivot.rotation.z = 0.22;
        mouthMesh.scale.y = 0.4 + normEnergy * 1.6;
      } else if (currentState === 'thinking') {
        bearRoot.position.y = -0.42 + Math.sin(clock * 3.8) * 0.03;
        headGroup.rotation.y = Math.sin(clock * 3.2) * 0.22;
        headGroup.rotation.z = Math.cos(clock * 2.5) * 0.1;
        leftArmPivot.rotation.x = -0.5 + Math.sin(clock * 4.5) * 0.18;
        mouthMesh.scale.y = 0.45 + Math.abs(Math.sin(clock * 4)) * 0.4;
      } else if (currentState === 'singing' || currentState === 'celebrating') {
        bearRoot.position.y = -0.42 + Math.abs(Math.sin(clock * 3.4)) * (0.06 + normEnergy * 0.08);
        headGroup.rotation.y = Math.sin(clock * 2.2) * 0.16 + targetMouseX * 0.18;
        headGroup.rotation.z = Math.sin(clock * 3.4) * 0.09;
        rightArmPivot.rotation.x = -0.52 + Math.sin(clock * 3.4) * 0.12;
        rightArmPivot.rotation.z = 0.24;
        leftArmPivot.rotation.x = -0.35 + Math.sin(clock * 3.4) * 0.22;
        mouthMesh.scale.y = 0.5 + normEnergy * 2.0 + Math.abs(Math.sin(clock * 5.2)) * 0.7;
      } else {
        // Cozy Idle in Velvet Armchair
        bearRoot.position.y = -0.42 + Math.sin(clock * 1.3) * 0.02 + boopImpulseRef.current * 0.14;
        headGroup.rotation.y = targetMouseX * 0.28 + Math.sin(clock * 0.9) * 0.05;
        headGroup.rotation.x = -targetMouseY * 0.14 + Math.cos(clock * 1.1) * 0.03;
        headGroup.rotation.z = Math.sin(clock * 0.8) * 0.03;
        rightArmPivot.rotation.x = -0.15 + Math.sin(clock * 1.2) * 0.04;
        rightArmPivot.rotation.z = 0.05;
        leftArmPivot.rotation.x = -0.15 + Math.cos(clock * 1.2) * 0.04;
        mouthMesh.scale.y = 0.35 + boopImpulseRef.current * 0.9;
      }

      // Foot tap to the beat
      leftLegGroup.rotation.x = Math.sin(clock * 2.8) * (0.04 + normEnergy * 0.12);
      rightLegGroup.rotation.x = -Math.sin(clock * 2.8) * (0.04 + normEnergy * 0.12);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 540;
      const h = container.clientHeight || 390;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
    };
  }, []);

  const handleClick = () => {
    boopImpulseRef.current = 1.0;
    if (onBoop) onBoop();
  };

  const stateBadgeText: Record<MascotState, string> = {
    idle: 'HUMMIT COZY STUDIO // 웅얼거릴 준비 완료',
    listening: 'LISTENING // 멜로디와 음정 윤곽을 귀 기울여 듣는 중...',
    thinking: 'MATCHING // 허밋 곰돌이가 레코드판에서 곡을 찾는 중...',
    singing: 'PLAYING // 원곡 하이라이트 바이닐 재생 중',
    celebrating: '98% MATCH! // 찾으시던 노래를 보관함에 담았어요!',
  };

  return (
    <div
      onClick={handleClick}
      className="relative w-full h-[340px] sm:h-[390px] rounded-3xl overflow-hidden cursor-pointer select-none border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.65)] group"
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Left Studio Status Pill */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121216]/80 backdrop-blur-md border border-[#F5B041]/30 text-[11px] font-mono tracking-wide text-[#F9F9FB]">
        <span
          className={`w-2 h-2 rounded-full ${
            state === 'listening'
              ? 'bg-[#FF5722] animate-ping'
              : state === 'thinking'
              ? 'bg-[#FFB300] animate-bounce'
              : 'bg-[#F5B041]'
          }`}
        />
        <span>{stateBadgeText[state]}</span>
      </div>

      {/* Top-Right Ear-Flap Interactive Badge */}
      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#121216]/75 backdrop-blur-md border border-white/10 text-[11px] text-[#F5B041] font-medium opacity-90 group-hover:border-[#F5B041]/50 transition">
        🧸 곰돌이 터치 시 귀 펄럭임
      </div>

      {/* Bottom Now Playing / Studio Caption */}
      {currentSongTitle && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#121216]/85 backdrop-blur-md border border-[#F5B041]/30">
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-[#F5B041] text-sm animate-spin-slow">💿</span>
            <span className="text-xs font-bold text-[#F9F9FB] truncate">
              {currentSongTitle}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#F5B041] shrink-0 ml-2">
            STUDIO MONITOR
          </span>
        </div>
      )}
    </div>
  );
};
