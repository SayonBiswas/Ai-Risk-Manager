export const SectionCard = ({ title, subtitle, children }) => (
  <section className="glass-panel rounded-xl p-6">
    <div className="mb-5">
      <h3 className="text-[#e4e1ed] font-semibold text-base">{title}</h3>
      {subtitle && <p className="text-sm text-[#c7c4d7]/50 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </section>
);

export const Segmented = ({ options, value, onChange, accent = '#c0c1ff', accentText = '#1000a9' }) => (
  <div
    className="grid gap-1 p-1 rounded-lg bg-[#0d0d15] border border-[#464554]"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="h-10 rounded-md text-sm font-medium transition-all"
          style={
            active
              ? { background: accent, color: accentText }
              : { color: 'rgba(199,196,215,0.7)' }
          }
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

export const Toggle = ({ checked, onChange, label, hint, accent = '#c0c1ff' }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="w-full flex items-center justify-between gap-4 rounded-lg bg-[#0d0d15] border border-[#464554] px-4 py-2.5 hover:border-[#c0c1ff]/50 transition-colors text-left"
  >
    <span>
      <span className="block text-sm text-[#e4e1ed]">{label}</span>
      {hint && <span className="block text-[11px] text-[#c7c4d7]/40">{hint}</span>}
    </span>
    <span
      className="w-11 h-6 rounded-full p-0.5 flex-shrink-0 transition-colors"
      style={{ background: checked ? accent : '#34343d' }}
    >
      <span
        className="block w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </span>
  </button>
);