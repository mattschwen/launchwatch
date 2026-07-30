interface WarningLightProps {
  color: 'green' | 'magenta' | 'red' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  spinning?: boolean;
  className?: string;
}

const colorMap = {
  green: {
    bg: '#63f6b2',
    glow: 'rgba(99, 246, 178, 0.62)',
    glowWide: 'rgba(99, 246, 178, 0.25)',
    beam: 'rgba(99, 246, 178, 0.5)',
    ring: 'rgba(99, 246, 178, 0.34)',
  },
  magenta: {
    bg: '#ff4fd8',
    glow: 'rgba(255, 79, 216, 0.65)',
    glowWide: 'rgba(255, 79, 216, 0.28)',
    beam: 'rgba(255, 79, 216, 0.52)',
    ring: 'rgba(255, 79, 216, 0.36)',
  },
  red: {
    bg: '#ff5c6c',
    glow: 'rgba(255, 92, 108, 0.62)',
    glowWide: 'rgba(255, 92, 108, 0.25)',
    beam: 'rgba(255, 92, 108, 0.5)',
    ring: 'rgba(255, 92, 108, 0.34)',
  },
  amber: {
    bg: '#ffc45c',
    glow: 'rgba(255, 196, 92, 0.62)',
    glowWide: 'rgba(255, 196, 92, 0.25)',
    beam: 'rgba(255, 196, 92, 0.5)',
    ring: 'rgba(255, 196, 92, 0.34)',
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
