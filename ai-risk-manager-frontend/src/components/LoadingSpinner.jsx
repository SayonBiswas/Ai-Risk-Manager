const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`border-2 border-[#34343d] border-t-[#c0c1ff] rounded-full animate-spin ${sizeClasses[size]}`}
      />
    </div>
  );
};

export default LoadingSpinner;
