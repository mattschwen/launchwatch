interface WarningLightProps {
  color: 'green' | 'red' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  spinning?: boolean;
  className?: string;
}

const colorMap = {
  green: {
    bg: '#00ff88',
    glow: 'rgba(0, 255, 136, 0.6)',
    glowWide: 'rgba(0, 255, 136, 0.25)',
    beam: 'rgba(0, 255, 136, 0.5)',
    ring: 'rgba(0, 255, 136, 0.3)',
  },
  red: {
    bg: '#ff3333',
    glow: 'rgba(255, 51, 51, 0.6)',
    glowWide: 'rgba(255, 51, 51, 0.25)',
    beam: 'rgba(255, 51, 51, 0.5)',
    ring: 'rgba(255, 51, 51, 0.3)',
  },
  amber: {
    bg: '#ffaa00',
    glow: 'rgba(255, 170, 0, 0.6)',
    glowWide: 'rgba(255, 170, 0, 0.25)',
    beam: 'rgba(255, 170, 0, 0.5)',
    ring: 'rgba(255, 170, 0, 0.3)',
  },
};

const sizeMap = {
  sm: { box: 14, lamp: 8, shadow: 6 },
  md: { box: 22, lamp: 12, shadow: 10 },
  lg: { box: 30, lamp: 16, shadow: 14 },
};

export default function WarningLight({
  color,
  size = 'md',
  spinning = true,
  className = '',
}: WarningLightProps): React.ReactElement {
  const c = colorMap[color];
  const s = sizeMap[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: s.box, height: s.box }}
    >
      {/* Lamp bulb */}
      <div
        className="rounded-full border"
        style={{
          width: s.lamp,
          height: s.lamp,
          background: c.bg,
          borderColor: c.ring,
          boxShadow: `0 0 ${s.shadow}px ${c.glow}, 0 0 ${s.shadow * 2}px ${c.glowWide}`,
        }}
      />
      {/* Spinning beam overlay */}
      {spinning && (
        <div
          className="absolute inset-0 rounded-full animate-[beacon-spin_1.5s_linear_infinite]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${c.beam} 40deg, transparent 120deg)`,
          }}
        />
      )}
    </div>
  );
}
