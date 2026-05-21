interface CactusLogoProps {
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
}

export function CactusLogo({ size = 'md', inverted = false }: CactusLogoProps) {
  const iconColor = inverted ? '#F8F6F1' : '#1C3B2E';
  const textColor = inverted ? '#F8F6F1' : '#1C3B2E';
  const subColor = inverted ? '#A8C4B0' : '#2E6B4F';

  const sizes = {
    sm: { icon: 24, cactus: 'text-base', partners: 'text-[10px]' },
    md: { icon: 32, cactus: 'text-xl', partners: 'text-xs' },
    lg: { icon: 44, cactus: 'text-3xl', partners: 'text-sm' },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Main trunk */}
        <rect x="17" y="14" width="6" height="30" rx="3" fill={iconColor} />
        {/* Top */}
        <rect x="17" y="4" width="6" height="14" rx="3" fill={iconColor} />
        {/* Left arm */}
        <rect x="6" y="18" width="6" height="14" rx="3" fill={iconColor} />
        <rect x="6" y="14" width="14" height="6" rx="3" fill={iconColor} />
        {/* Right arm */}
        <rect x="28" y="22" width="6" height="12" rx="3" fill={iconColor} />
        <rect x="20" y="18" width="14" height="6" rx="3" fill={iconColor} />
        {/* Ground dots */}
        <circle cx="14" cy="46" r="2" fill={iconColor} opacity="0.4" />
        <circle cx="20" cy="47" r="2" fill={iconColor} opacity="0.4" />
        <circle cx="26" cy="46" r="2" fill={iconColor} opacity="0.4" />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-bold uppercase tracking-widest ${s.cactus}`}
          style={{ fontFamily: '"Playfair Display", Georgia, serif', color: textColor }}
        >
          CACTUS
        </span>
        <span
          className={`font-light tracking-[0.2em] uppercase ${s.partners}`}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', color: subColor }}
        >
          partners
        </span>
      </div>
    </div>
  );
}
