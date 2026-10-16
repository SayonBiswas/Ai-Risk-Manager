const FormField = ({ label, hint, error, className = '', children }) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70">
          {label}
        </label>
        {hint && <span className="text-[11px] text-[#c7c4d7]/40">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-[#ffb4ab] mt-1.5">{error}</p>}
    </div>
  );
};

export default FormField;