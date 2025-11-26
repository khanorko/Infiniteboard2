import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

interface StarfieldProps {
  isWarping?: boolean;
  onWarpComplete?: () => void;
  // Board mode props
  mode?: 'onboarding' | 'board';
  parallaxOffsetX?: number;
  parallaxOffsetY?: number;
  // Motion burst ref for zoom/teleport feedback
  triggerBurstRef?: React.MutableRefObject<((intensity: number, duration?: number) => void) | null>;
}

const Starfield: React.FC<StarfieldProps> = ({ 
  isWarping = false, 
  onWarpComplete,
  mode = 'onboarding',
  parallaxOffsetX = 0,
  parallaxOffsetY = 0,
  triggerBurstRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const animationRef = useRef<number>(0);
  const speedRef = useRef(mode === 'board' ? 0.05 : 0.5);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);

  // Update parallax offset
  useEffect(() => {
    parallaxRef.current = { x: parallaxOffsetX, y: parallaxOffsetY };
  }, [parallaxOffsetX, parallaxOffsetY]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.z = 500;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Stars - fewer and dimmer for board mode
    const starCount = mode === 'board' ? 1500 : 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const basePositions = new Float32Array(starCount * 3); // Store initial positions for parallax

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Spread stars in a cylinder around the camera
      const radius = Math.random() * 800 + 100;
      const theta = Math.random() * Math.PI * 2;
      
      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = Math.sin(theta) * radius;
      positions[i3 + 2] = (Math.random() - 0.5) * 2000;
      
      // Store base positions
      basePositions[i3] = positions[i3];
      basePositions[i3 + 1] = positions[i3 + 1];
      basePositions[i3 + 2] = positions[i3 + 2];

      // Slight color variation (bluish white to warm white)
      const colorMix = Math.random();
      const brightness = mode === 'board' ? 0.4 : 1; // Dimmer for board
      colors[i3] = (0.8 + colorMix * 0.2) * brightness;     // R
      colors[i3 + 1] = (0.85 + colorMix * 0.15) * brightness; // G
      colors[i3 + 2] = (0.95 + (1 - colorMix) * 0.05) * brightness; // B

      sizes[i] = (Math.random() * 2 + 0.5) * (mode === 'board' ? 0.7 : 1);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Star material
    const material = new THREE.PointsMaterial({
      size: mode === 'board' ? 1.5 : 2,
      vertexColors: true,
      transparent: true,
      opacity: mode === 'board' ? 0.6 : 0.9,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
    starsRef.current = stars;

    // Store base positions on the geometry for parallax calculation
    (geometry as any).basePositions = basePositions;

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const positions = stars.geometry.attributes.position.array as Float32Array;
      const base = (stars.geometry as any).basePositions as Float32Array;
      const speed = speedRef.current;
      const { x: px, y: py } = parallaxRef.current;

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        
        // Apply parallax offset (stars move slower than canvas)
        if (mode === 'board') {
          positions[i3] = base[i3] + px * 0.1;
          positions[i3 + 1] = base[i3 + 1] + py * 0.1;
        }
        
        positions[i3 + 2] += speed;

        // Reset stars that pass the camera
        if (positions[i3 + 2] > 1000) {
          positions[i3 + 2] = -1000;
          if (mode !== 'board') {
            const radius = Math.random() * 800 + 100;
            const theta = Math.random() * Math.PI * 2;
            positions[i3] = Math.cos(theta) * radius;
            positions[i3 + 1] = Math.sin(theta) * radius;
            base[i3] = positions[i3];
            base[i3 + 1] = positions[i3 + 1];
          }
        }
      }

      stars.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      geometry.dispose();
      material.dispose();
    };
  }, [mode]);

  // Expose triggerBurst function for zoom/teleport feedback
  useEffect(() => {
    if (triggerBurstRef) {
      triggerBurstRef.current = (intensity: number, duration = 300) => {
        const baseSpeed = mode === 'board' ? 0.05 : 0.5;
        speedRef.current = baseSpeed + intensity;
        
        // Ease back to normal after duration
        setTimeout(() => {
          const ease = () => {
            speedRef.current *= 0.85;
            if (Math.abs(speedRef.current - baseSpeed) > 0.01) {
              requestAnimationFrame(ease);
            } else {
              speedRef.current = baseSpeed;
            }
          };
          ease();
        }, duration);
      };
    }
    
    return () => {
      if (triggerBurstRef) {
        triggerBurstRef.current = null;
      }
    };
  }, [mode, triggerBurstRef]);

  // Handle warp effect
  useEffect(() => {
    if (isWarping && mode === 'onboarding') {
      // Accelerate stars
      const startTime = Date.now();
      const duration = 2000; // 2 seconds warp

      const accelerate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Exponential acceleration
        speedRef.current = 0.5 + progress * progress * 50;
        
        // Fade out near the end
        if (progress > 0.6) {
          setOpacity(1 - ((progress - 0.6) / 0.4));
        }

        if (progress < 1) {
          requestAnimationFrame(accelerate);
        } else {
          onWarpComplete?.();
        }
      };

      accelerate();
    }
  }, [isWarping, onWarpComplete, mode]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0"
      style={{ opacity }}
    />
  );
};

export default Starfield;
