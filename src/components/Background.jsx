import React, { useEffect, useRef } from 'react';

// --- SELF-CONTAINED 3D PERLIN NOISE ENGINE ---
class PerlinNoise {
  constructor() {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    
    // Shuffle permutation table
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = tmp;
    }
    
    this.perm = new Uint8Array(512);
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  dot(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  mix(a, b, t) {
    return (1 - t) * a + t * b;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    const gAA = this.grad3[this.perm[AA] % 12];
    const gBA = this.grad3[this.perm[BA] % 12];
    const gAB = this.grad3[this.perm[AB] % 12];
    const gBB = this.grad3[this.perm[BB] % 12];
    const gAA1 = this.grad3[this.perm[AA + 1] % 12];
    const gBA1 = this.grad3[this.perm[BA + 1] % 12];
    const gAB1 = this.grad3[this.perm[AB + 1] % 12];
    const gBB1 = this.grad3[this.perm[BB + 1] % 12];

    return this.mix(
      this.mix(
        this.mix(this.dot(gAA, x, y, z), this.dot(gBA, x - 1, y, z), u),
        this.mix(this.dot(gAB, x, y - 1, z), this.dot(gBB, x - 1, y - 1, z), u),
        v
      ),
      this.mix(
        this.mix(this.dot(gAA1, x, y, z - 1), this.dot(gBA1, x - 1, y, z - 1), u),
        this.mix(this.dot(gAB1, x, y - 1, z - 1), this.dot(gBB1, x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

export default function Background({ isPlaying = false, analyser = null }) {
  const canvasRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const analyserRef = useRef(analyser);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    analyserRef.current = analyser;
  }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    let animationId = null;
    let t = 0;

    const noiseEngine = new PerlinNoise();

    // 3D Grid Parameters (Dynamic density based on screen width for mobile performance)
    const isMobile = window.innerWidth < 768;
    const COLS = isMobile ? 45 : 85;
    const ROWS = isMobile ? 35 : 60;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Pre-allocate projected grid points to avoid garbage collection overhead
    const projectedGrid = Array.from({ length: ROWS }, () => new Array(COLS));

    // Smooth 3D projection frame loop
    const render = () => {
      animationId = requestAnimationFrame(render);

      // Pitch black screen clear
      ctx.fillStyle = '#050202'; // Locked app background color
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.45; // Horizon around upper-middle
      
      // Calculate layout dynamic spacing based on viewport size and grid density
      const spacingX = Math.max(8, canvas.width / 80);
      const spacingY = 12;

      // Camera Angles & Constants
      const tiltAngle = 0.64; // Low viewpoint tilt angle
      const cosT = Math.cos(tiltAngle);
      const sinT = Math.sin(tiltAngle);
      const fov = 400;
      const depthOffset = 450;

      // Read real frequency data from Web Audio AnalyserNode
      let bass = 0;
      let mids = 0;
      let treble = 0;

      const currentAnalyser = analyserRef.current;
      if (currentAnalyser && isPlayingRef.current) {
        const bufferLength = currentAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        currentAnalyser.getByteFrequencyData(dataArray);

        // Lows (Bass): bins 0 to 4 (approx 0Hz to 340Hz)
        let bassSum = 0;
        for (let i = 0; i < 5; i++) {
          bassSum += dataArray[i];
        }
        bass = (bassSum / 5) / 255;

        // Mids: bins 5 to 25 (approx 340Hz to 1700Hz)
        let midsSum = 0;
        for (let i = 5; i < 26; i++) {
          midsSum += dataArray[i];
        }
        mids = (midsSum / 21) / 255;

        // Highs (Treble): bins 26 to 80 (approx 1700Hz to 5400Hz)
        let trebleSum = 0;
        for (let i = 26; i < 81; i++) {
          trebleSum += dataArray[i];
        }
        treble = (trebleSum / 55) / 255;
      }

      // Modulate topographic heights and speed based on real-time frequencies
      // Fall back to a gentle breathing animation when no audio is playing
      const baseHeight = 150;
      const activeHeightScale = baseHeight * (1 + (bass > 0.02 ? bass * 0.95 : Math.sin(t * 0.03) * 0.12));
      const activeSpeedMultiplier = 1 + (mids > 0.02 ? mids * 1.5 : 0);
      const activeLineWidth = 0.9 * (1 + (bass > 0.02 ? bass * 0.45 : 0));

      // 1. Calculate and Project All Grid Vertices
      for (let r = 0; r < ROWS; r++) {
        // worldY goes from negative (horizon) to positive (foreground/close)
        const worldY = (r - ROWS / 2) * spacingY;
        const rowRatio = r / ROWS; // 0 at back, 1 at front

        for (let c = 0; c < COLS; c++) {
          const worldX = (c - COLS / 2) * spacingX;

          // Perlin noise calculation for elevation Z
          // Stretch noise along X (lower scale) to create long horizontal waves
          const noiseScaleX = 0.0025;
          const noiseScaleY = 0.006;
          const zSample = noiseEngine.noise(
            worldX * noiseScaleX,
            (worldY - t * 1.6 * activeSpeedMultiplier) * noiseScaleY,
            t * 0.0015
          );

          // Base Z displacement
          let worldZ = zSample * activeHeightScale;

          // Valley filter to keep cards readable:
          // Deep valley at the horizon (under cards), shallower/more open at foreground
          const centerXRatio = Math.abs(c - COLS / 2) / (COLS / 2); // 0 at center, 1 at edges
          const valleyDepth = 0.12 + 0.88 * Math.pow(centerXRatio, 2.0);
          const frontValleyDepth = 0.45 + 0.55 * Math.pow(centerXRatio, 1.2);
          const finalValley = (1 - rowRatio) * valleyDepth + rowRatio * frontValleyDepth;
          
          worldZ *= finalValley;

          // Correct 3D Perspective Tilt Rotation & Translation
          // Front of grid (worldY > 0) projects closer to camera (lower camZ)
          const camY = worldY * cosT - worldZ * sinT;
          const camZ = -worldY * sinT - worldZ * cosT + depthOffset;

          // Project to 2D screen coordinates
          const screenX = centerX + (worldX * fov) / camZ;
          const screenY = centerY + (camY * fov) / camZ + 120; // vertical offset

          projectedGrid[r][c] = {
            x: screenX,
            y: screenY,
            z: camZ,
            worldZ: worldZ
          };
        }
      }

      // 2. Draw Topographic Contour Lines (Row by Row)
      for (let r = 0; r < ROWS; r++) {
        ctx.beginPath();
        let drawing = false;

        for (let c = 0; c < COLS; c++) {
          const pt = projectedGrid[r][c];
          if (!pt) continue;

          // Fog-like Horizon Fade: fade out in distance (camZ close to 660)
          const depthFade = Math.max(0, Math.min(1, 1 - (pt.z - 240) / 420));
          if (depthFade <= 0.01) {
            if (drawing) {
              ctx.stroke();
              ctx.beginPath();
              drawing = false;
            }
            continue;
          }

          // Apply dynamic strokes based on depth
          ctx.lineWidth = activeLineWidth * (0.3 + 0.7 * depthFade);
          ctx.strokeStyle = `rgba(255, 42, 59, ${depthFade * 0.42})`; // Theme color red

          if (!drawing) {
            ctx.moveTo(pt.x, pt.y);
            drawing = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        if (drawing) {
          ctx.stroke();
        }
      }

      // 3. Draw Glowing Grid Intersections (Dots)
      // Every 3 columns and 2 rows to match a constellation-topography hybrid mesh
      for (let r = 0; r < ROWS; r += 2) {
        for (let c = 1; c < COLS; c += 3) {
          const pt = projectedGrid[r][c];
          if (!pt) continue;

          const depthFade = Math.max(0, Math.min(1, 1 - (pt.z - 240) / 420));
          if (depthFade <= 0.05) continue;

          // Height-based glowing factors (peaks are brighter and larger)
          const heightFactor = Math.max(0, Math.min(1, (pt.worldZ + 75) / 150));
          const ambientPulse = Math.sin(t * 0.05 + r * c) * 0.5;
          const pulseSize = (1.5 + ambientPulse) * (1 + (treble > 0.02 ? treble * 1.5 : 0));
          const dotSize = pulseSize * depthFade * (0.8 + heightFactor * 1.2);

          // Render glowing dot core (shifts from red to brighter orange/white core for peaks/highs)
          const redColor = 255;
          const greenColor = Math.min(255, Math.floor(42 + heightFactor * 100 + treble * 113));
          const blueColor = Math.min(255, Math.floor(59 + heightFactor * 100 + treble * 196));
          const dotOpacity = depthFade * (0.4 + heightFactor * 0.5 + treble * 0.1);

          ctx.fillStyle = `rgba(${redColor}, ${greenColor}, ${blueColor}, ${dotOpacity})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dotSize, 0, Math.PI * 2);
          ctx.fill();

          // Add surrounding glow aura to vertices
          const glowCheck = treble > 0.02 || isPlayingRef.current;
          if (depthFade > 0.3 && (heightFactor > 0.6 || glowCheck)) {
            const glowOpacity = depthFade * 0.12 * (heightFactor * 0.5 + (treble > 0.02 ? treble * 0.8 : 0.2));
            ctx.fillStyle = `rgba(255, 42, 59, ${glowOpacity})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, dotSize * 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      t += 1.8; // Faster animation speed for more motion
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
        backgroundColor: '#050202'
      }}
      id="flowFieldCanvas"
    />
  );
}
