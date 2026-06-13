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

export default function Background({ isPlaying = false }) {
  const canvasRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    let animationId = null;
    let t = 0;

    const noiseEngine = new PerlinNoise();

    // 3D Grid Parameters
    const COLS = 42;
    const ROWS = 32;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Smooth 3D projection frame loop
    const render = () => {
      animationId = requestAnimationFrame(render);

      // Pitch black screen clear
      ctx.fillStyle = '#050202'; // Locked app background color
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.4; // Slightly elevated center horizon
      
      // Calculate layout dynamic spacing based on viewport size
      const spacingX = Math.max(16, canvas.width / 34);
      const spacingY = 16;

      // Camera Angles & Constants
      const tiltAngle = 0.62; // Low viewpoint tilt angle
      const cosT = Math.cos(tiltAngle);
      const sinT = Math.sin(tiltAngle);
      const fov = 380;
      const depthOffset = 360;

      // Audio beat reaction - Double pulse simulated heartbeat (lub-dub)
      let heartBeat = 0;
      if (isPlayingRef.current) {
        const timeSecs = Date.now() / 1000;
        const beatCycle = (timeSecs * 1.15) % 1.0; // ~70 BPM
        if (beatCycle < 0.15) {
          // Lub (first heart pulse)
          heartBeat = Math.sin((beatCycle / 0.15) * Math.PI) * 0.45;
        } else if (beatCycle >= 0.22 && beatCycle < 0.37) {
          // Dub (second heart pulse)
          heartBeat = Math.sin(((beatCycle - 0.22) / 0.15) * Math.PI) * 0.30;
        }
      }

      // Modulate topographic heights based on heartbeat pulses
      const baseHeight = 55;
      const activeHeightScale = baseHeight * (1 + heartBeat * 0.7);
      const activeSpeedMultiplier = 1 + heartBeat * 0.45;
      const activeLineWidth = 0.8 * (1 + heartBeat * 0.5);

      // We pre-calculate all projected points grid to draw line strips correctly
      const projectedGrid = [];

      for (let r = 0; r < ROWS; r++) {
        projectedGrid[r] = [];
        
        // As rows go deeper, spacing can be compressed
        const worldY = (r - ROWS / 2) * spacingY;

        for (let c = 0; c < COLS; c++) {
          const worldX = (c - COLS / 2) * spacingX;

          // Perlin noise calculation for elevation Z
          // Offset worldY coordinate with time t to flow the terrain waves forward
          const noiseScale = 0.0035;
          const zSample = noiseEngine.noise(
            worldX * noiseScale,
            (worldY - t * 0.8 * activeSpeedMultiplier) * noiseScale,
            t * 0.0008
          );

          // Base Z displacement
          let worldZ = zSample * activeHeightScale;

          // Add a beautiful valley at the center of the viewport so cards are readable
          const centerXRatio = Math.abs(c - COLS / 2) / (COLS / 2); // 0 at center, 1 at edges
          worldZ *= (0.2 + 0.8 * Math.pow(centerXRatio, 1.8));

          // Tilt rotation around X-axis & depth translation
          const camY = worldY * cosT - worldZ * sinT;
          const camZ = worldY * sinT + worldZ * cosT + depthOffset;

          // Project to 2D
          const screenX = centerX + (worldX * fov) / camZ;
          const screenY = centerY + (camY * fov) / camZ + 120; // vertical offset

          projectedGrid[r][c] = {
            x: screenX,
            y: screenY,
            z: camZ
          };
        }
      }

      // Draw Topographic Contour Lines (Row by Row)
      for (let r = 0; r < ROWS; r++) {
        ctx.beginPath();
        let drawing = false;

        for (let c = 0; c < COLS; c++) {
          const pt = projectedGrid[r][c];
          if (!pt) continue;

          // Fog-like Horizon Fade out: lines disappear in the far distance
          const depthFade = Math.max(0, Math.min(1, (1 - (pt.z - 180) / 480)));
          if (depthFade <= 0.01) {
            if (drawing) {
              ctx.stroke();
              ctx.beginPath();
              drawing = false;
            }
            continue;
          }

          // Apply dynamic strokes based on beat pulse and depth
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

      // Draw Glowing Grid Intersections (Dots)
      // We draw dots every 3 columns and 2 rows to match a constellation-topography hybrid mesh
      for (let r = 0; r < ROWS; r += 2) {
        for (let c = 1; c < COLS; c += 3) {
          const pt = projectedGrid[r][c];
          if (!pt) continue;

          const depthFade = Math.max(0, Math.min(1, (1 - (pt.z - 180) / 480)));
          if (depthFade <= 0.05) continue;

          // Glowing vertex points
          const pulseSize = (1.2 + Math.sin(t * 0.05 + r * c) * 0.4) * (1 + heartBeat * 0.5);
          const dotSize = pulseSize * depthFade;

          ctx.fillStyle = `rgba(255, 60, 80, ${depthFade * 0.65})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dotSize, 0, Math.PI * 2);
          ctx.fill();

          // Add a tiny surrounding glow aura to vertices
          if (depthFade > 0.4 && isPlayingRef.current) {
            ctx.fillStyle = `rgba(255, 42, 59, ${depthFade * 0.15 * heartBeat})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, dotSize * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      t += 1.4; // Timeline update
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
