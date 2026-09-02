const StatusChip = ({ status }) => {
  const getStatusClass = (status) => {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'ALLOW' || statusUpper === 'LOW') {
      return 'status-chip-allow';
    }
    if (statusUpper === 'FLAG' || statusUpper === 'MEDIUM') {
      return 'status-chip-flag';
    }
    if (statusUpper === 'BLOCK' || statusUpper === 'HIGH') {
      return 'status-chip-block';
    }
    return 'bg-surface-variant text-on-surface-variant border border-outline-variant';
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusClass(status)}`}
    >
      {status}
    </span>
  );
};

export default StatusChip;
