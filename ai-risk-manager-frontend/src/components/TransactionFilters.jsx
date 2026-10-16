import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const TransactionFilters = ({ filters, onChange, onClear }) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const onChangeRef = useRef(onChange);
  const filtersRef = useRef(filters);

  // Keep refs in sync
  useEffect(() => {
    onChangeRef.current = onChange;
    filtersRef.current = filters;
  }, [onChange, filters]);

  // Sync search input with filters.search (when URL params change)
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeRef.current({ ...filtersRef.current, search: searchInput || null, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDecisionChange = (e) => {
    onChange({ ...filters, decision: e.target.value === 'all' ? null : e.target.value, page: 1 });
  };

  const handleFromDateChange = (e) => {
    onChange({ ...filters, from_date: e.target.value || null, page: 1 });
  };

  const handleToDateChange = (e) => {
    onChange({ ...filters, to_date: e.target.value || null, page: 1 });
  };

  const hasActiveFilters = filters.decision || filters.from_date || filters.to_date || filters.search;

  return (
    <div className="glass-panel rounded-xl p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Decision dropdown */}
        <div className="flex-1 min-w-[150px]">
          <select
            className="rm-input text-sm"
            value={filters.decision || 'all'}
            onChange={handleDecisionChange}
          >
            <option value="all">All Decisions</option>
            <option value="ALLOW">ALLOW</option>
            <option value="FLAG">FLAG</option>
            <option value="BLOCK">BLOCK</option>
          </select>
        </div>

        {/* From date */}
        <div className="flex-1 min-w-[150px]">
          <input
            type="date"
            className="rm-input text-sm"
            value={filters.from_date || ''}
            onChange={handleFromDateChange}
          />
        </div>

        {/* To date */}
        <div className="flex-1 min-w-[150px]">
          <input
            type="date"
            className="rm-input text-sm"
            value={filters.to_date || ''}
            onChange={handleToDateChange}
          />
        </div>

        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            className="rm-input text-sm"
            placeholder="Search by Transaction ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-sm text-[#c7c4d7]/60 hover:text-[#ffb4ab] transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default TransactionFilters;
