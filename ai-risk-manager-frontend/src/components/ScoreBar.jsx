const ScoreBar = ({ score, label }) => {
  const percentage = Math.min(score * 100, 100);
  
  const getColor = (score) => {
    if (score < 0.5) return '#4edea3';
    if (score < 0.8) return '#ffb95f';
    return '#ffb4ab';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        {label && <span className="text-sm text-[#c7c4d7]">{label}</span>}
        <span className={`font-medium text-[#e4e1ed] ${label ? 'text-sm' : 'text-xs'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#1f1f27] rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getColor(score)
          }}
        />
      </div>
    </div>
  );
};

export default ScoreBar;
