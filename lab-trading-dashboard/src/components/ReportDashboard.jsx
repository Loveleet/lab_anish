import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PairStatsGrid from './PairStatsGrid';
import PairStatsFilters from './PairStatsFilters';
import Sidebar from './Sidebar';
// Animated SVG background for LAB title (copied from main dashboard)
function AnimatedGraphBackground({ width = 400, height = 80, opacity = 0.4 }) {
  const [points1, setPoints1] = useState([]);
  const [points2, setPoints2] = useState([]);
  const tRef = useRef(0);
  const basePoints = [0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400];
  useEffect(() => {
    let frame;
    function animate() {
      tRef.current += 0.008;
      const p1 = basePoints.map((x, i) => {
        const y = 40 + 20 * Math.sin(tRef.current + i * 0.5) + 10 * Math.sin(tRef.current * 0.5 + i);
        return `${x},${Math.round(y + 20)}`;
      });
      const p2 = basePoints.map((x, i) => {
        const y = 40 + 20 * Math.cos(tRef.current + i * 0.6) + 10 * Math.cos(tRef.current * 0.4 + i);
        return `${x},${Math.round(y)}`;
      });
      setPoints1(p1);
      setPoints2(p2);
      frame = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity }}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      preserveAspectRatio="none"
    >
      <polyline points={points1.join(' ')} stroke="green" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <polyline points={points2.join(' ')} stroke="red" strokeWidth="4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
// Placeholder for ListViewComponent
const ListViewComponent = ({ pair, candleType, interval, onBack, gridPreview, onIntervalChange, onCandleTypeChange }) => (
  <div style={{ padding: 32, minHeight: '100vh', position: 'relative' }}>
    {/* Grid preview in top left */}
    <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, minWidth: 220, minHeight: 180 }}>
      {gridPreview}
    </div>
    <button onClick={onBack} style={{ marginBottom: 16, position: 'absolute', top: 24, right: 32, zIndex: 20 }}>Back</button>
    <div style={{ marginLeft: 220, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{pair}</h2>
      <label style={{ fontWeight: 500 }}>
        Interval:
        <select value={interval} onChange={e => onIntervalChange(e.target.value)} style={{ marginLeft: 8, padding: 4 }}>
          <option value="1m">1m</option>
          <option value="3m">3m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="30m">30m</option>
          <option value="1h">1h</option>
          <option value="4h">4h</option>
        </select>
      </label>
      <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
        Candle Type:
        <button
          onClick={() => onCandleTypeChange(candleType === 'Regular' ? 'Heiken' : 'Regular')}
          style={{ marginLeft: 8, padding: '4px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#f3f4f6', fontWeight: 600 }}
        >
          {candleType}
        </button>
      </label>
    </div>
    <h3 style={{ marginLeft: 220, fontSize: 18, fontWeight: 400, color: '#444' }}>
      {pair} ({candleType}, {interval})
    </h3>
    {/* TODO: Implement list view details */}
  </div>
);

const ReportDashboard = () => {
  const navigate = useNavigate();
  // Move darkMode state to the top to ensure it is initialized before any usage
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('pair_stats_theme');
      if (theme) return theme === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [candleType, setCandleType] = useState('Regular');
  const [interval, setInterval] = useState('15m');
  const [trades, setTrades] = useState([]);
  const [symbols, setSymbols] = useState([]); // <-- Add state for unique symbols

  // State for group selection feature
  const [groupModeEnabled, setGroupModeEnabled] = useState(false);
  const [selectedGroupPairs, setSelectedGroupPairs] = useState([]);
  const [showForClubFilter, setShowForClubFilter] = useState('All');


  // Filter state and logic (moved from PairStatsGrid)
  const canonicalSignalKeys = [
    "2POLE_IN5LOOP", "IMACD", "2POLE_Direct_Signal", "HIGHEST SWING HIGH", "LOWEST SWING LOW", "NORMAL SWING HIGH", "NORMAL SWING LOW", "ProGap", "CrossOver", "Spike", "Kicker"
  ];
  const [selectedSignals, setSelectedSignals] = useState(() => {
    const saved = localStorage.getItem('pair_stats_selected_signals');
    if (saved) return JSON.parse(saved);
    const obj = {};
    canonicalSignalKeys.forEach(s => obj[s] = true);
    return obj;
  });
  const [signalRadioMode, setSignalRadioMode] = useState(() => localStorage.getItem('pair_stats_signal_radio_mode') === 'true');
  const [signalToggleAll, setSignalToggleAll] = useState(() => localStorage.getItem('pair_stats_signal_toggle_all') === 'true');

  const [machines, setMachines] = useState([]);
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await fetch('https://lab-code-1.onrender.com/api/machines');
        const data = await res.json();
        setMachines(Array.isArray(data.machines) ? data.machines : []);
      } catch (e) {
        setMachines([]);
      }
    };
    fetchMachines();
  }, []);
  const allMachines = machines.filter(m => m.Active);
  const [selectedMachines, setSelectedMachines] = useState(() => {
    const saved = localStorage.getItem('pair_stats_selected_machines');
    if (saved) return JSON.parse(saved);
    const obj = {};
    allMachines.forEach(m => obj[m.MachineId] = true);
    return obj;
  });
  const [machineRadioMode, setMachineRadioMode] = useState(() => localStorage.getItem('pair_stats_machine_radio_mode') === 'true');
  const [machineToggleAll, setMachineToggleAll] = useState(() => localStorage.getItem('pair_stats_machine_toggle_all') === 'true');

  const [selectedActions, setSelectedActions] = useState(() => {
    const saved = localStorage.getItem('pair_stats_selected_actions');
    if (saved) return JSON.parse(saved);
    return { BUY: true, SELL: true };
  });
  const [actionRadioMode, setActionRadioMode] = useState(() => localStorage.getItem('pair_stats_action_radio_mode') === 'true');
  const [actionToggleAll, setActionToggleAll] = useState(() => localStorage.getItem('pair_stats_action_toggle_all') === 'true');

  // Fetch trades data
  useEffect(() => {
    fetch('https://lab-code-1.onrender.com/api/trades')
      .then(res => res.json())
      .then(data => {
        const allTrades = Array.isArray(data.trades) ? data.trades : [];
        setTrades(allTrades);
        // Extract unique symbols from trades
        const uniqueSymbols = [...new Set(allTrades.map(t => t.Pair).filter(Boolean))];
        setSymbols(uniqueSymbols);
      })
      .catch(() => {
        setTrades([]);
        setSymbols([]);
      });
  }, []);

  useEffect(() => {
    // Debug: log unique symbols and their count
    if (symbols.length > 0) {
      console.log('Unique symbols in dashboard:', symbols, 'Count:', symbols.length);
    }
  }, [symbols]);

  // 1. Apply all filters (signal, machine, action, etc.)
  function filterTrades(trades) {
    return trades.filter(t => {
      // Signal filter
      if (Object.keys(selectedSignals).length && !selectedSignals[t.SignalFrom]) return false;
      // Machine filter
      if (Object.keys(selectedMachines).length && !selectedMachines[t.MachineId]) return false;
      // Action filter
      if (Object.keys(selectedActions).length && !selectedActions[t.Action]) return false;
      return true;
    });
  }
  const fullyFilteredTrades = filterTrades(trades);

  // 2. Apply the stat/club filter
  function filterTradesByStat(trades, stat) {
    switch (stat) {
      case 'Total Closed Stats':
        return trades.filter(t => t.Type === "close" || t.Type === "hedge_close");
      case 'Direct Closed Stats':
        return trades.filter(t => t.Type === "close");
      case 'Hedge Closed Stats':
        return trades.filter(t => t.Hedge === true && t.Type === "hedge_close");
      case 'Total Running Stats':
        return trades.filter(t => t.Type === "running" && t.Hedge_1_1_bool === false);
      case 'Direct Running Stats':
        return trades.filter(t => t.Type === "running" && t.Hedge === false);
      case 'Hedge Running Stats':
        return trades.filter(t => t.Hedge_1_1_bool === false && t.Hedge === true && t.Type === "running");
      case 'Total Stats':
        return trades;
      case 'Buy Sell Stats':
        return trades.filter(t => t.Action === "BUY" || t.Action === "SELL");
      case 'Hedge on Hold':
        return trades.filter(t => t.Hedge === true && t.Hedge_1_1_bool === true);
      default:
        return trades;
    }
  }
  const filteredTradesByStat = filterTradesByStat(fullyFilteredTrades, showForClubFilter);

  // 3. Extract unique symbols for the grid
  const filteredSymbols = [...new Set(filteredTradesByStat.map(t => t.Pair).filter(Boolean))];

  useEffect(() => {
    // Debug: log filtered symbols and their count for the selected stat
    if (filteredSymbols.length > 0) {
      console.log('Filtered symbols for', showForClubFilter, ':', filteredSymbols, 'Count:', filteredSymbols.length);
    } else {
      console.log('No symbols for', showForClubFilter);
    }
  }, [filteredSymbols, showForClubFilter]);

  // Handler for selecting a pair from the grid
  const handlePairSelect = (pair) => {
    if (groupModeEnabled) {
      setSelectedGroupPairs(prev => {
        const isSelected = prev.some(p => p === pair);
        if (isSelected) {
          return prev.filter(p => p !== pair);
        } else {
          return [...prev, pair];
        }
      });
    } else {
      // Navigate to ListViewPage as a new route
      navigate(`/reports/list?pair=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}&type=${encodeURIComponent(candleType)}`);
    }
  };

  // Handler for going back to grid view
  const handleBack = () => {
    // setSelectedPair(null); // This line is removed
  };

  // Helper: filter trades by all selected filters (use SignalFrom and MachineId)
  function filterTrades(trades) {
    return trades.filter(t => {
      // Signal filter
      if (Object.keys(selectedSignals).length && !selectedSignals[t.SignalFrom]) return false;
      // Machine filter
      if (Object.keys(selectedMachines).length && !selectedMachines[t.MachineId]) return false;
      // Action filter
      if (Object.keys(selectedActions).length && !selectedActions[t.Action]) return false;
      return true;
    });
  }
  const filteredTrades = filterTrades(trades);

  // Render a preview of the selected card (for List View)
  const gridPreview = null; // Always null as selectedPair is removed

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('pair_stats_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('pair_stats_theme', 'light');
    }
  }, [darkMode]);

  // Prepare the filter bar as a variable
  const filterBar = (
    <PairStatsFilters
      canonicalSignalKeys={canonicalSignalKeys}
      selectedSignals={selectedSignals}
      setSelectedSignals={setSelectedSignals}
      signalRadioMode={signalRadioMode}
      setSignalRadioMode={setSignalRadioMode}
      signalToggleAll={signalToggleAll}
      setSignalToggleAll={setSignalToggleAll}
      allMachines={allMachines}
      selectedMachines={selectedMachines}
      setSelectedMachines={setSelectedMachines}
      machineRadioMode={machineRadioMode}
      setMachineRadioMode={setMachineRadioMode}
      machineToggleAll={machineToggleAll}
      setMachineToggleAll={setMachineToggleAll}
      selectedActions={selectedActions}
      setSelectedActions={setSelectedActions}
      actionRadioMode={actionRadioMode}
      setActionRadioMode={setActionRadioMode}
      actionToggleAll={actionToggleAll}
      setActionToggleAll={setActionToggleAll}
      trades={trades}
      darkMode={darkMode}
    />
  );

  // Sidebar open/close state (copied from main dashboard)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Only show grid for filteredSymbols
  const tradesForGrid = filteredTradesByStat.filter(t => filteredSymbols.includes(t.Pair));

  return (
    <div style={{ minHeight: '100vh', width: '100vw', position: 'relative', background: darkMode ? '#000' : '#f8fafc', display: 'flex' }}>
      {/* Sidebar on the left */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      {/* Main content: LAB header, filters, grid/list */}
      <div style={{ flex: 1, minWidth: 0, marginLeft: isSidebarOpen ? '256px' : '80px', transition: 'margin-left 0.3s', padding: '0 24px' }}>
        {/* LAB header (copied from main dashboard) */}
        <div className="sticky top-0 z-40 flex justify-center items-center border-b border-gray-200 dark:border-gray-700 shadow-sm bg-[#f5f6fa] dark:bg-black" style={{ minHeight: '80px', height: '80px', padding: '0 16px' }}>
          <button
            onClick={() => setIsSidebarOpen(o => !o)}
            className="absolute left-4 top-3 z-20 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow hover:scale-110 transition-all"
            title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            style={{ fontSize: 24 }}
          >
            <span style={{ fontSize: 24 }}>{isSidebarOpen ? '🡸' : '☰'}</span>
          </button>
          {/* Dark/Bright mode toggle button (right side) */}
          <button
            onClick={() => setDarkMode(dm => !dm)}
            className="absolute right-8 top-3 z-20 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow hover:scale-110 transition-all"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ fontSize: 24 }}
          >
            {darkMode ? '🌞' : '🌙'}
          </button>
          <AnimatedGraphBackground width={400} height={48} opacity={0.4} />
          <h1
            className="relative z-10 text-5xl font-extrabold text-center bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight animate-pulse"
            style={{ WebkitTextStroke: '1px #222', textShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
          >
            LAB
            <span className="block w-16 h-1 mx-auto mt-2 rounded-full bg-gradient-to-r from-blue-400 via-pink-400 to-yellow-300 animate-gradient-x"></span>
          </h1>
        </div>
        {/* Filter bar, grid/list, etc. */}
            {/* Group Selection Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <button
            onClick={() => setGroupModeEnabled(g => !g)}
                style={{
              background: groupModeEnabled ? '#22c55e' : '#d1d5db',
              color: groupModeEnabled ? '#fff' : '#222',
                  border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 16,
                  cursor: 'pointer',
              marginRight: 8,
                }}
              >
                {groupModeEnabled ? 'Group Mode Enabled' : 'Enable Group Mode'}
              </button>
          {/* Show for club dropdown is always visible */}
              <select
                value={showForClubFilter}
            onChange={e => setShowForClubFilter(e.target.value)}
            style={{
              fontSize: 16,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #888',
              background: '#fff',
              color: '#222',
              fontWeight: 500,
              minWidth: 220,
              marginRight: 8,
            }}
          >
                <option value="Total Closed Stats">Total Closed Stats</option>
                <option value="Direct Closed Stats">Direct Closed Stats</option>
                <option value="Hedge Closed Stats">Hedge Closed Stats</option>
                <option value="Total Running Stats">Total Running Stats</option>
                <option value="Direct Running Stats">Direct Running Stats</option>
                <option value="Hedge Running Stats">Hedge Running Stats</option>
                <option value="Total Stats">Total Stats</option>
                <option value="Buy Sell Stats">Buy Sell Stats</option>
                <option value="Hedge on Hold">Hedge on Hold</option>
              </select>
              <button
                onClick={() => {
                  const allVisiblePairs = trades.map(t => t.Pair);
                  const uniquePairs = [...new Set(allVisiblePairs)];
                  if (selectedGroupPairs.length === uniquePairs.length) {
                    setSelectedGroupPairs([]);
                  } else {
                    setSelectedGroupPairs(uniquePairs);
                  }
                }}
                disabled={!groupModeEnabled}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                {selectedGroupPairs.length === trades.map(t => t.Pair).filter((v, i, a) => a.indexOf(v) === i).length ? 'Unselect All' : 'Select All'}
              </button>
              <button
                onClick={() => {
                  const symbols = selectedGroupPairs.join(',');
                  navigate(`/pages/group-view?symbols=${encodeURIComponent(symbols)}&interval=${encodeURIComponent(interval)}&type=${encodeURIComponent(candleType)}`);
                }}
                disabled={selectedGroupPairs.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedGroupPairs.length > 0 ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  fontWeight: '600',
                  cursor: selectedGroupPairs.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                View in Group ({selectedGroupPairs.length})
              </button>
            </div>
            <PairStatsGrid
              key="main-grid"
              onPairSelect={handlePairSelect}
              candleType={candleType}
              interval={interval}
          trades={tradesForGrid}
          selectedPair={null} // Always null
              darkMode={darkMode}
              filterBar={filterBar}
              groupModeEnabled={groupModeEnabled}
              selectedGroupPairs={selectedGroupPairs}
              setSelectedGroupPairs={setSelectedGroupPairs}
            />
      </div>
    </div>
  );
};

export default ReportDashboard; 