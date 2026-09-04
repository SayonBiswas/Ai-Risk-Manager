const FormField = ({ label, children }) => {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
};

export default FormField;