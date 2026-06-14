interface SealStampProps {
  status: 'pass' | 'warn' | 'danger';
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function SealStamp({ status, text, className = '', size = 'md' }: SealStampProps) {
  const defaultTexts: Record<string, string> = {
    pass: '校核通过',
    warn: '待改进',
    danger: '不达标',
  };

  const colors = {
    pass: { bg: 'rgba(74,155,131,0.92)', border: '#2f6a58', shadow: 'rgba(74,155,131,0.45)' },
    warn: { bg: 'rgba(160,82,45,0.92)', border: '#7b3c20', shadow: 'rgba(160,82,45,0.45)' },
    danger: { bg: 'rgba(194,65,12,0.92)', border: '#872a0c', shadow: 'rgba(194,65,12,0.45)' },
  };

  const sizes = {
    sm: { w: 44, h: 44, fs: 9 },
    md: { w: 60, h: 60, fs: 10 },
    lg: { w: 76, h: 76, fs: 12 },
  };

  const sz = sizes[size];
  const c = colors[status];
  const display = text ?? defaultTexts[status];
  const rotate = status === 'pass' ? -6 : status === 'warn' ? 5 : -3;

  return (
    <div
      className={`seal-pop inline-flex flex-col items-center justify-center rounded-lg text-white font-bold ${className}`}
      style={{
        width: sz.w,
        height: sz.h,
        backgroundColor: c.bg,
        border: `2px solid ${c.border}`,
        boxShadow: `0 3px 10px ${c.shadow}, inset 0 0 0 1px rgba(255,255,255,0.15)`,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <span
        className="leading-tight text-center font-song tracking-wider px-1"
        style={{ fontSize: sz.fs }}
      >
        {display.split('').map((ch, i) => (
          <span key={i} className={i > 0 ? 'block' : ''}>{ch}</span>
        ))}
      </span>
    </div>
  );
}
