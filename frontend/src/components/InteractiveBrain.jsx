import { useState, useEffect, useRef } from "react";

export default function InteractiveBrain({
  imageSrc = "/assets/hero_brain_connectome.jpg",
  showFloatingBadges = true,
  className = "",
  variant = "hero", // "hero" | "auth" | "compact"
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tilt tracking for depth perspective
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  // Live Canvas Synaptic Particle Network
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth || (variant === "hero" ? 640 : 360));
    let height = (canvas.height = canvas.offsetHeight || (variant === "hero" ? 560 : 360));

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || (variant === "hero" ? 640 : 360);
      height = canvas.height = canvas.offsetHeight || (variant === "hero" ? 560 : 360);
    };
    window.addEventListener("resize", onResize);

    const numPoints = variant === "hero" ? 85 : 45;
    const points = [];
    const radiusX = width * 0.36;
    const radiusY = height * 0.32;
    const radiusZ = width * 0.32;

    for (let i = 0; i < numPoints; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      points.push({
        x: radiusX * Math.sin(phi) * Math.cos(theta),
        y: radiusY * Math.sin(phi) * Math.sin(theta) * 0.88,
        z: radiusZ * Math.cos(phi),
        baseRadius: Math.random() * 2.0 + 1.2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      angleY += 0.004;
      const effectiveRotY = angleY + (rotateY * Math.PI) / 180;
      const effectiveRotX = (rotateX * Math.PI) / 180;

      const cosY = Math.cos(effectiveRotY);
      const sinY = Math.sin(effectiveRotY);
      const cosX = Math.cos(effectiveRotX);
      const sinX = Math.sin(effectiveRotX);

      const projected = [];
      const fov = 420;
      const centerX = width * (variant === "hero" ? 0.52 : 0.5);
      const centerY = height * 0.48;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;

        let y1 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        const scale = fov / (fov + z2 + 100);
        const projX = x1 * scale + centerX;
        const projY = y1 * scale + centerY;

        projected.push({
          x: projX,
          y: projY,
          z: z2,
          scale: scale,
          baseRadius: p.baseRadius,
          pulseOffset: p.pulseOffset,
          pulseSpeed: p.pulseSpeed,
        });
      }

      // Draw Filaments
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < (variant === "hero" ? 82 : 65)) {
            const alpha = (1 - dist / (variant === "hero" ? 82 : 65)) * 0.38 * Math.min(projected[i].scale, projected[j].scale);
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.strokeStyle = `rgba(60, 174, 163, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      // Draw Glowing Nodes
      const time = Date.now() * 0.002;
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const pulse = Math.sin(time * p.pulseSpeed * 20 + p.pulseOffset) * 0.5 + 0.5;
        const radius = p.baseRadius * p.scale * (1 + pulse * 0.4);
        const alpha = Math.max(0.2, Math.min(1, (p.z + 180) / 360)) * (0.6 + pulse * 0.4);

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.5);
        gradient.addColorStop(0, `rgba(60, 174, 163, ${alpha * 0.95})`);
        gradient.addColorStop(0.5, `rgba(168, 220, 213, ${alpha * 0.45})`);
        gradient.addColorStop(1, "rgba(60, 174, 163, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pulse > 0.7 ? "#FFFFFF" : "#A8DCD5";
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
    };
  }, [rotateX, rotateY, variant]);

  return (
    <div
      ref={containerRef}
      className={`connectome-display-root ${variant} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="connectome-perspective-wrap"
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${
            isHovered ? 1.02 : 1
          }, ${isHovered ? 1.02 : 1}, 1)`,
        }}
      >
        {/* Ambient Halo */}
        <div className="connectome-ambient-glow"></div>

        {/* Authentic DTI Connectome Brain Visual */}
        <img
          src={imageSrc}
          alt="MindCare AI Connectome Neural Network"
          className="connectome-core-img"
        />

        {/* Live Canvas Synapses */}
        <canvas ref={canvasRef} className="connectome-canvas-layer" />

        {/* Parallax Information Badges (Strictly no "3D" text) */}
        {showFloatingBadges && variant === "hero" && (
          <>
            <div
              className="connectome-badge badge-top-right"
              style={{
                transform: `translateZ(45px) translateX(${rotateY * 0.7}px) translateY(${
                  rotateX * 0.7
                }px)`,
              }}
            >
              <div className="badge-pulse-indicator"></div>
              <div>
                <span className="badge-title">Neural Connectome Telemetry</span>
                <span className="badge-subtitle">Real-time Visuospatial Tracking</span>
              </div>
            </div>

            <div
              className="connectome-badge badge-bottom-left"
              style={{
                transform: `translateZ(55px) translateX(${rotateY * -0.8}px) translateY(${
                  rotateX * -0.8
                }px)`,
              }}
            >
              <div className="badge-icon-tag">🧠</div>
              <div>
                <span className="badge-title">Deep ResNet-18 Heatmap</span>
                <span className="badge-subtitle">Structural Atrophy Stratification</span>
              </div>
            </div>

            <div
              className="connectome-status-pill"
              style={{
                transform: `translateZ(30px)`,
              }}
            >
              <span className="sync-dot"></span>
              <span>Active Connectome Synapse</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
