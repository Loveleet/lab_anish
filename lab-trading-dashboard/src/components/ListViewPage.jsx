import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ListViewComponent from './ListViewComponent';
import PairStatsGrid from './PairStatsGrid';
import PairStatsFilters from './PairStatsFilters';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// loveleet work
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const canonicalSignalKeys = [
  "2POLE_IN5LOOP", "IMACD", "2POLE_Direct_Signal", "HIGHEST SWING HIGH", "LOWEST SWING LOW", "NORMAL SWING HIGH", "NORMAL SWING LOW", "ProGap", "CrossOver", "Spike", "Kicker"
];

const columnOptions = [
  { label: 'Candle Time', value: 'Candle_Time' },
  { label: 'Symbol', value: 'symbol' },
  { label: 'Interval', value: 'interval' },
  { label: 'Signal Type', value: 'signal_type' },
  { label: 'Signal Source', value: 'signal_source' },
  { label: 'Candle Pattern', value: 'candle_pattern' },
  { label: 'Price', value: 'price' },
  { label: 'Squeeze Status', value: 'squeeze_status' },
  { label: 'Active Squeeze', value: 'active_squeeze' },
  { label: 'Machine ID', value: 'machine_id' },
  { label: 'Timestamp', value: 'timestamp' },
  { label: 'Processing Time', value: 'processing_time_ms' },
  { label: 'Created At', value: 'created_at' },
  { label: 'Unique ID', value: 'Unique_id' },
];

const masterIntervals = ['1m','3m','5m','15m','30m','1h','4h','1d'];

const commonColumnOptions = [
  { label: 'Candle Time', value: 'Candle_Time' },
  { label: 'Symbol', value: 'symbol' },
  { label: 'Signal Type', value: 'signal_type' },
  { label: 'Signal Source', value: 'signal_source' },
  { label: 'Candle Pattern', value: 'candle_pattern' },
  { label: 'Price', value: 'price' },
  { label: 'Squeeze Status', value: 'squeeze_status' },
  { label: 'Active Squeeze', value: 'active_squeeze' },
  { label: 'Machine ID', value: 'machine_id' },
  { label: 'Timestamp', value: 'timestamp' },
  { label: 'Processing Time', value: 'processing_time_ms' },
  { label: 'Created At', value: 'created_at' },
  { label: 'Unique ID', value: 'Unique_id' },
];

// Blacklist of unwanted indicator group names (garbage fields)
const unwantedIndicatorGroups = [
  'ha_high', 'ha_low', 'ha_open', 'ha_close', 'rsi', 'rsi_14', 'rsi_9', 'rsi_6', 'rsi_7', 'rsi_8', 'rsi_10', 'rsi_12', 'rsi_13', 'rsi_15', 'rsi_20', 'rsi_21', 'rsi_25', 'rsi_30', 'rsi_50', 'rsi_100',
  'open', 'high', 'low', 'close', 'volume', 'quote_volume', 'num_trades', 'taker_base_vol', 'taker_quote_vol', 'color', 'Time', 'CloseTime',
  // Add more as needed
];

// Filter jsonColumnOptions to exclude unwanted fields
// const filteredJsonColumnOptions = jsonColumnOptions.filter(opt => !unwantedIndicatorGroups.includes(opt.value));

const tradeDataColumnOptions = [
  { label: 'Machine ID', value: 'MachineId' },
  { label: 'Unique ID', value: 'Unique_id' },
  { label: 'Candle Time', value: 'Candel_time' },
  { label: 'Fetcher Trade Time', value: 'Fetcher_Trade_time' },
  { label: 'Operator Trade Time', value: 'Operator_Trade_time' },
  { label: 'Pair', value: 'Pair' },
  { label: 'Interval', value: 'Interval' },
  { label: 'Action', value: 'Action' },
  { label: 'PL After Comm', value: 'Pl_after_comm' },
  { label: 'Hedge Buy PL', value: 'Hedge_Buy_pl' },
  { label: 'Hedge Sell PL', value: 'Hedge_Sell_pl' },
  { label: 'Type', value: 'Type' },
  { label: 'Operator Close Time', value: 'Operator_Close_time' },
  { label: 'Signal From', value: 'SignalFrom' },
  { label: 'Profit Journey', value: 'Profit_journey' },
  { label: 'Commission Journey', value: 'Commision_journey' },
  { label: 'Stop Price', value: 'Stop_price' },
  { label: 'Save Price', value: 'Save_price' },
  { label: 'Min Comm', value: 'Min_comm' },
  { label: 'Hedge', value: 'Hedge' },
  { label: 'Hedge 1-1 Bool', value: 'Hedge_1_1_bool' },
  { label: 'Hedge Order Size', value: 'Hedge_order_size' },
  { label: 'Min Comm After Hedge', value: 'Min_comm_after_hedge' },
  { label: 'Min Profit', value: 'Min_profit' },
  { label: 'Buy Qty', value: 'Buy_qty' },
  { label: 'Buy Price', value: 'Buy_price' },
  { label: 'Buy PL', value: 'Buy_pl' },
  { label: 'Added Qty', value: 'Added_qty' },
  { label: 'Sell Qty', value: 'Sell_qty' },
  { label: 'Sell Price', value: 'Sell_price' },
  { label: 'Sell PL', value: 'Sell_pl' },
  { label: 'Close Price', value: 'Close_price' },
  { label: 'Commission', value: 'Commission' },
  { label: 'Investment', value: 'Investment' },
  { label: 'Swing1', value: 'Swing1' },
  { label: 'Swing2', value: 'Swing2' },
  { label: 'Swing3', value: 'Swing3' },
  { label: 'Swing4', value: 'Swing4' },
  { label: 'Swing5', value: 'Swing5' },
  { label: 'Hedge Swing High Point', value: 'Hedge_Swing_High_Point' },
  { label: 'Hedge Swing Low Point', value: 'Hedge_Swing_Low_Point' },
  { label: 'Temp High Point', value: 'Temp_High_Point' },
  { label: 'Temp Low Point', value: 'Temp_Low_Point' }
];

// Helper to get all visible columns (common + JSON + trade data)
function getAllVisibleColumns(selectedColumns, stableJsonColumns, selectedTradeColumns) {
  const common = selectedColumns.map(col => ({
    key: col,
    label: col.replace(/_/g, ' '),
    type: 'common',
    visible: true
  }));
  const json = stableJsonColumns.flatMap(parentObj =>
    (parentObj.intervals || []).map(interval => ({
      key: `${parentObj.value}__${interval}`,
      label: `${parentObj.label} [${interval}]`,
      type: 'json',
      parent: parentObj.value,
      interval,
      visible: true
    }))
  );
  const trade = selectedTradeColumns.map(col => ({
    key: `trade_${col}`,
    label: `Trade: ${col.replace(/_/g, ' ')}`,
    type: 'trade',
    field: col,
    visible: true
  }));
  return [...common, ...json, ...trade];
}

const LABEL_TYPE = 'LABEL_ROW';

function DraggableLabelRow({ item, index, moveLabel, children, onHover, onDrop }) {
  const ref = React.useRef(null);
  const [, drop] = useDrop({
    accept: LABEL_TYPE,
    hover(draggedItem) {
      if (draggedItem.index === index) return;
      moveLabel(draggedItem.index, index);
      draggedItem.index = index;
      if (onHover) onHover();
    },
    drop() {
      if (onDrop) onDrop();
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: LABEL_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drag(drop(ref));
  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        width: 'auto',
        minWidth: 160,
        maxWidth: 340,
        flex: '1 1 220px',
        marginBottom: 0,
        background: 'inherit',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {children}
    </div>
  );
}

function DroppableLabelList({ items, moveLabel, renderRow, activeJsonLabels, setActiveJsonLabels, showUnchecked, dragOverIndex, setDragOverIndex }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      width: '100%',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      boxSizing: 'border-box',
      minHeight: 60,
      position: 'relative',
    }}>
      {items.map((item, idx) => (
        <div key={item.type + '_' + item.value} style={{ position: 'relative', minWidth: 220, maxWidth: 340, flex: '1 1 220px', boxSizing: 'border-box', marginBottom: 0, display: 'flex' }}>
          {/* Drop position indicator (above) */}
          {dragOverIndex === idx && (
            <div style={{
              position: 'absolute',
              top: -8,
              left: 0,
              width: '100%',
              height: 0,
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}>
              <div style={{
                width: 32,
                height: 32,
                background: '#0ea5e9',
                color: '#fff',
                borderRadius: '50%',
                fontWeight: 700,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px #0ea5e944',
                marginLeft: 8,
                marginBottom: 2,
              }}>{idx + 1}</div>
              <div style={{
                flex: 1,
                height: 4,
                background: '#ffe066',
                borderRadius: 2,
                marginLeft: 12,
                marginRight: 8,
              }} />
            </div>
          )}
          <DraggableLabelRow
            item={item}
            index={idx}
            moveLabel={moveLabel}
            onHover={() => setDragOverIndex(idx)}
            onDrop={() => setDragOverIndex(null)}
          >
            {/* Position number and (for json) interval toggle button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 22 }}>
              <span style={{ fontWeight: 700, color: '#0ea5e9', minWidth: 22, textAlign: 'right' }}>{idx + 1}.</span>
              {/* Interval toggle button for json parent */}
              {item && item.type === 'json' && Array.isArray(item.intervals) && (() => {
                const allIntervals = (item.intervals || []).filter(({ exists }) => exists);
                const checkedIntervals = allIntervals.filter(({ interval }) => !!activeJsonLabels?.[item.value]?.[interval]);
                const allChecked = allIntervals.length > 0 && checkedIntervals.length === allIntervals.length;
                const toggleAllIntervals = () => {
                  const newState = !allChecked;
                  setActiveJsonLabels(prev => {
                    const updated = { ...prev };
                    if (!updated[item.value]) updated[item.value] = {};
                    allIntervals.forEach(({ interval }) => {
                      updated[item.value][interval] = newState;
                    });
                    return updated;
                  });
                };
                return (
                  <button
                    onClick={toggleAllIntervals}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      background: allChecked ? '#22c55e' : '#ef4444',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      boxShadow: allChecked ? '0 2px 4px #22c55e44' : '0 2px 4px #ef444444',
                      minWidth: 36,
                    }}
                    title={`${allChecked ? 'Uncheck' : 'Check'} all intervals for ${item?.label || ''}`}
                  >
                    {checkedIntervals.length}/{allIntervals.length}
                  </button>
                );
              })()}
            </div>
            {renderRow && renderRow(item, idx)}
          </DraggableLabelRow>
        </div>
      ))}
    </div>
  );
}

const ListViewPage = () => {
  const query = useQuery();
  const pair = query.get('pair') || '';
  const interval = query.get('interval') || '15m';
  const candleType = query.get('type') || 'Regular';

  // Utility function to format dates (now always in UTC)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear().toString().slice(-2); // Last 2 digits
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  // Helper function to check if a field is a date field
  const isDateField = (fieldName) => {
    const dateFields = [
      'Candle_Time', 'timestamp', 'created_at', 'Time',
      'Candel_time', 'Fetcher_Trade_time', 'Operator_Trade_time', 'Operator_Close_time',
      'candle_time', 'time', 'date'
    ];
    // Exclude numeric time fields that should be sorted numerically
    const numericTimeFields = ['processing_time_ms', 'processing_time'];
    
    const isDate = dateFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase())) &&
                   !numericTimeFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()));
    

    return isDate;
  };

  // Helper function to format cell value
  const formatCellValue = (value, fieldName) => {
    if (value == null || value === '') return '';
    
    // Check if it's a date field and format accordingly
    if (isDateField(fieldName)) {
      return formatDate(value);
    }
    
    // Return original value for non-date fields
    return String(value);
  };

  // Dark mode state - use same theme as main grid view
  const [darkMode, setDarkMode] = useState(() => {
    const theme = localStorage.getItem('pair_stats_theme');
    if (theme) return theme === 'dark';
    // Fallback to main app theme if pair_stats_theme not set
    const mainTheme = localStorage.getItem('theme');
    if (mainTheme) return mainTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('pair_stats_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('pair_stats_theme', 'light');
    }
  }, [darkMode]);
  
  // Sync with main app theme changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'theme' || e.key === 'pair_stats_theme') {
        const newTheme = e.newValue === 'dark';
        setDarkMode(newTheme);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filter state
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

  // Trade data - use same data source as main grid
  const [trades, setTrades] = useState([]);
  useEffect(() => {
    // Fetch all trades like the main grid does, then filter by pair
    fetch('https://lab-code-1.onrender.com/api/trades')
      .then(res => res.json())
      .then(data => {
        const allTrades = Array.isArray(data.trades) ? data.trades : [];
        // Filter by pair if specified
        const tradesArray = pair ? allTrades.filter(t => t.Pair === pair) : allTrades;
        setTrades(tradesArray);

      })
      .catch(() => setTrades([]));
  }, [pair]); // Add pair as dependency to refetch when symbol changes

  // Log data (SignalProcessingLogs) with pagination
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsPerPage, setLogsPerPage] = useState(() => {
    const saved = localStorage.getItem('listview_logs_per_page');
    return saved ? parseInt(saved) : 100;
  });
  // Add loading state for logs
  const [logsLoading, setLogsLoading] = useState(true);
  const [apiJsonLabels, setApiJsonLabels] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  useEffect(() => {
    setLogsLoading(true);
    setCurrentPage(1); // Reset to first page when symbol changes
    // Fetch logs filtered by symbol from the database using existing API with pagination
    const url = pair 
      ? `https://lab-code-1.onrender.com/api/SignalProcessingLogs?symbol=${encodeURIComponent(pair)}&page=1&limit=${logsPerPage}`
      : `https://lab-code-1.onrender.com/api/SignalProcessingLogs?page=1&limit=${logsPerPage}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const logsArray = Array.isArray(data.logs) ? data.logs : [];
        setLogs(logsArray);
        setTotalLogs(data.pagination?.total || logsArray.length);
        setTotalPages(data.pagination?.totalPages || 1);
        setLogsLoading(false);

        if (Array.isArray(data.logs) && data.logs.length > 0) {
          let json;
          try {
            json = typeof data.logs[0].json_data === 'string'
              ? JSON.parse(data.logs[0].json_data)
              : data.logs[0].json_data;
          } catch (e) {

            return;
          }


        }
      })
      .catch((error) => {
        console.error('[ListViewPage] Error fetching logs:', error);
        setLogs([]);
        setLogsLoading(false);
      });
  }, [pair, logsPerPage]); // Add pair and logsPerPage as dependencies

  // Candle type selections (must be declared before filteredLogs)
  const [selectedCandleTypes, setSelectedCandleTypes] = useState(() => {
    const saved = localStorage.getItem('pair_stats_selected_candle_types');
    return saved ? JSON.parse(saved) : { Regular: true, Heiken: false };
  });

  // Save candle type selections to localStorage
  useEffect(() => {
    localStorage.setItem('pair_stats_selected_candle_types', JSON.stringify(selectedCandleTypes));
  }, [selectedCandleTypes]);

  // Filter logs for candle pattern column values only (symbol filtering is now done at database level)
  const filteredLogs = logs.filter(log => {
    // Get the candle pattern directly from the candle_pattern column
    const candlePattern = log.candle_pattern?.toLowerCase() || '';
    

        
        // Check if the log's candle pattern matches any selected candle types
    const isRegular = candlePattern === 'regular' || candlePattern === 'normal' || candlePattern === 'regular_candle';
    const isHeiken = candlePattern === 'heiken' || candlePattern === 'heikin' || candlePattern === 'heiken-ashi' || 
                    candlePattern === 'heiken_ashi' || candlePattern === 'heiken_candle';
    

        
        // Show log if it matches any selected candle type
        if (selectedCandleTypes.Regular && isRegular) return true;
        if (selectedCandleTypes.Heiken && isHeiken) return true;
        
        // If neither candle type is selected, don't show any logs
        if (!selectedCandleTypes.Regular && !selectedCandleTypes.Heiken) return false;
        
        // If specific candle types are selected but this log doesn't match, filter it out
        return false;
  });

  // Count candle types for debugging
  const candleTypeCounts = useMemo(() => {
    const counts = { Regular: 0, Heiken: 0, Unknown: 0 };
    
    logs.forEach(log => {
      // Get the candle pattern directly from the candle_pattern column
      const candlePattern = log.candle_pattern?.toLowerCase() || '';
      
      const isRegular = candlePattern === 'regular' || candlePattern === 'normal' || candlePattern === 'regular_candle';
      const isHeiken = candlePattern === 'heiken' || candlePattern === 'heikin' || candlePattern === 'heiken-ashi' || 
                      candlePattern === 'heiken_ashi' || candlePattern === 'heiken_candle';
      
      if (isRegular) counts.Regular++;
      else if (isHeiken) counts.Heiken++;
      else counts.Unknown++;
    });
    
    return counts;
  }, [logs]);



  // Filter trades for signals, machines, and actions only (symbol filtering is now done at database level)
  function filterTrades(trades) {
    return trades.filter(t => {
      if (Object.keys(selectedSignals).length && !selectedSignals[t.SignalFrom]) return false;
      if (Object.keys(selectedMachines).length && !selectedMachines[t.MachineId]) return false;
      if (Object.keys(selectedActions).length && !selectedActions[t.Action]) return false;
      return true;
    });
  }
  const filteredTrades = filterTrades(trades);

  // Function to handle changing rows per page
  const handleRowsPerPageChange = (newRowsPerPage) => {
    if (newRowsPerPage < 10 || newRowsPerPage > 5000) return; // Limit between 10 and 5000
    
    setLogsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page
    localStorage.setItem('listview_logs_per_page', newRowsPerPage.toString());
    
    // Refetch data with new page size
    setLogsLoading(true);
    const url = pair 
      ? `https://lab-code-1.onrender.com/api/SignalProcessingLogs?symbol=${encodeURIComponent(pair)}&page=1&limit=${newRowsPerPage}`
      : `https://lab-code-1.onrender.com/api/SignalProcessingLogs?page=1&limit=${newRowsPerPage}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const logsArray = Array.isArray(data.logs) ? data.logs : [];
        setLogs(logsArray);
        setTotalLogs(data.pagination?.total || logsArray.length);
        setTotalPages(data.pagination?.totalPages || 1);
        setLogsLoading(false);
        console.log(`[ListViewPage] Changed to ${newRowsPerPage} rows per page, fetched ${logsArray.length} logs`);
      })
      .catch((error) => {
        console.error('[ListViewPage] Error fetching logs:', error);
        setLogs([]);
        setLogsLoading(false);
      });
  };

  // Function to handle page changes
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    setLogsLoading(true);
    setCurrentPage(newPage);
    
    const url = pair 
      ? `https://lab-code-1.onrender.com/api/SignalProcessingLogs?symbol=${encodeURIComponent(pair)}&page=${newPage}&limit=${logsPerPage}`
      : `https://lab-code-1.onrender.com/api/SignalProcessingLogs?page=${newPage}&limit=${logsPerPage}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const logsArray = Array.isArray(data.logs) ? data.logs : [];
        setLogs(logsArray);
        console.log(`[ListViewPage] Fetched ${logsArray.length} logs for symbol: ${pair || 'all'} (Page ${newPage} of ${data.pagination?.totalPages || 1})`);
      })
      .catch((error) => {
        console.error('[ListViewPage] Error fetching logs:', error);
        setLogs([]);
      })
      .finally(() => {
        setLogsLoading(false);
      });
  };

  // Filter bar
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

  // Read reputation settings from localStorage for grid preview
  const repEnabled = localStorage.getItem('pair_stats_reputation_enabled') === 'true';
  const repIntensity = localStorage.getItem('pair_stats_reputation_intensity');
  const repMode = localStorage.getItem('pair_stats_reputation_mode') || 'perTrade';

  // Apply the same filtering logic as the main grid view
  const filteredTradesForGrid = trades.filter(t => {
    // Signal filter
    if (Object.keys(selectedSignals).length && !selectedSignals[t.SignalFrom]) return false;
    // Machine filter
    if (Object.keys(selectedMachines).length && !selectedMachines[t.MachineId]) return false;
    // Action filter
    if (Object.keys(selectedActions).length && !selectedActions[t.Action]) return false;
    return true;
  });

  // Grid preview for the selected pair (defined after filterBar)

  const gridPreview = (
    <PairStatsGrid
      onPairSelect={() => {}}
      candleType={candleType}
      interval={interval}
      trades={filteredTradesForGrid} // Use filtered trades data like main grid
      selectedPair={pair}
      previewMode
      darkMode={darkMode}
      reputationEnabled={repEnabled}
      reputationIntensity={repIntensity !== null ? Number(repIntensity) : 0}
      reputationMode={repMode}
    />
  );

  // Create a map of trades by unique_id for quick lookup
  const tradesByUniqueId = useMemo(() => {
    const map = {};
    filteredTrades.forEach(trade => {
      if (trade.Unique_id) {
        map[trade.Unique_id] = trade;
      }
    });
    return map;
  }, [filteredTrades]);

  // Add font size state
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('list_font_size');
    return saved ? parseFloat(saved) : 1.0;
  });
  useEffect(() => {
    localStorage.setItem('list_font_size', fontSize);
  }, [fontSize]);

  // --- JSON Columns Settings: Simple, Always-Present List ---
  // After extracting from logs, this is the master list of available labels/intervals
  // On load, restore selection from localStorage, but only for available labels/intervals
  useEffect(() => {
    const saved = localStorage.getItem('pair_stats_selected_json_columns');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only keep intervals that are present in the logs
      const cleaned = {};
      // This block is removed as per the edit hint to remove jsonColumnOptions and filteredJsonColumnOptions.
      // The logic for restoring JSON column selection from localStorage is now handled by apiJsonLabels.
    } else {
      // If nothing saved, default to all intervals checked
      const allChecked = {};
      // This block is removed as per the edit hint to remove jsonColumnOptions and filteredJsonColumnOptions.
      // The logic for defaulting JSON column selection to all intervals is now handled by apiJsonLabels.
    }
    // eslint-disable-next-line
  }, [JSON.stringify(apiJsonLabels)]); // Changed to apiJsonLabels

  // On any change, save to localStorage
  useEffect(() => {
    // This block is removed as per the edit hint to remove jsonColumnOptions and filteredJsonColumnOptions.
    // The logic for saving JSON column selection to localStorage is now handled by apiJsonLabels.
  }, []);

  // In the settings modal rendering (where jsonColumnsMatrix is used):
  // Only render the JSON columns section if availableJsonColumns has data
  const showJsonColumns = apiJsonLabels && apiJsonLabels.length > 0;

  // Restore selectedColumns (regular) from localStorage on load
  useEffect(() => {
    const saved = localStorage.getItem('pair_stats_selected_columns');
    if (saved) {
      try {
        // setSelectedColumns(JSON.parse(saved)); // This line is removed
      } catch {
        // setSelectedColumns(commonColumnOptions.map(opt => opt.value)); // This line is removed
      }
    } else {
      // setSelectedColumns(commonColumnOptions.map(opt => opt.value)); // This line is removed
    }
    // eslint-disable-next-line
  }, []);

  // Save selectedColumns to localStorage on change
  useEffect(() => {
    // This block is removed as per the edit hint to remove jsonColumnOptions and filteredJsonColumnOptions.
    // The logic for saving regular column selection to localStorage is now handled by activeRegularLabels.
  }, []);

  // Restore selectedTradeColumns from localStorage on load
  useEffect(() => {
    const saved = localStorage.getItem('pair_stats_selected_trade_columns');
    if (saved) {
      try {
        // setSelectedTradeColumns(JSON.parse(saved)); // This line is removed
      } catch {
        // setSelectedTradeColumns(['MachineId', 'Action', 'Type', 'Pl_after_comm']); // This line is removed
      }
    } else {
      // setSelectedTradeColumns(['MachineId', 'Action', 'Type', 'Pl_after_comm']); // This line is removed
    }
    // eslint-disable-next-line
  }, []);

  // Save selectedTradeColumns to localStorage on change
  useEffect(() => {
    // This block is removed as per the edit hint to remove jsonColumnOptions and filteredJsonColumnOptions.
    // The logic for saving trade column selection to localStorage is now handled by tradeDataColumnOptions.
  }, []);

  const REGULAR_LABELS_KEY = 'listview_regular_labels';
  const defaultRegularLabels = commonColumnOptions.map(opt => opt.value);
  const getInitialRegularLabels = () => {
    const saved = localStorage.getItem(REGULAR_LABELS_KEY);
    if (saved) return JSON.parse(saved);
    return defaultRegularLabels;
  };

  const [settingsOpen, setSettingsOpen] = useState(() => {
    const saved = localStorage.getItem('listview_settings_modal_open');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeRegularLabels, setActiveRegularLabels] = useState(getInitialRegularLabels());

  // Auto-save removed - only save when Save button is clicked

  // JSON Data Labels Section State and Helpers
  const JSON_LABELS_KEY = 'listview_json_labels';
  const getDefaultJsonState = () => {
    const state = {};
    // This block is removed as per the edit hint to remove jsonColumnOptions and filteredJsonColumnOptions.
    // The logic for defaulting JSON column selection to all intervals is now handled by apiJsonLabels.
  };
  const getInitialJsonLabels = () => {
    const saved = localStorage.getItem(JSON_LABELS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  };
  const [activeJsonLabels, setActiveJsonLabels] = useState(getInitialJsonLabels());
  // Auto-save removed - only save when Save button is clicked

  // Helper: Extract all unique JSON labels from logs (top-level keys in json_data)
  function extractJsonLabelsAndIntervals(logs) {
    const intervalSet = new Set();
    const labelMap = {};

    logs.forEach((log) => {
      if (!log.json_data) return;
      let json;
      try {
        if (typeof log.json_data === 'string') {
          // Replace NaN, Infinity, -Infinity with null for invalid JSON
          let raw = log.json_data.replace(/\bNaN\b|\bInfinity\b|\b-Infinity\b/g, 'null');
          json = JSON.parse(raw);
        } else {
          json = log.json_data;
        }
      } catch {
        return;
      }
      const allRows = json?.signal_data?.all_last_rows;
      if (allRows && typeof allRows === 'object') {
        Object.keys(allRows).forEach(interval => {
          if (interval === 'candle_type') return;
          intervalSet.add(interval);
          const row = allRows[interval];
          if (row && typeof row === 'object') {
            Object.keys(row).forEach(label => {
            if (!labelMap[label]) labelMap[label] = new Set();
            labelMap[label].add(interval);
          });
          }
        });
      }
    });

    const allIntervals = Array.from(intervalSet).sort((a, b) => {
      // Custom sort: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 1d
      const order = ["1m","3m","5m","15m","30m","1h","2h","4h","1d"];
      return order.indexOf(a) - order.indexOf(b);
    });

    return Object.entries(labelMap).map(([label, intervals]) => ({
      label,
      value: label,
      intervals: allIntervals.map(interval => ({
        interval,
        exists: intervals.has(interval)
      }))
    }));
  }

  // State for extracted API labels
  useEffect(() => {
    if (logs.length > 0) {
      const labels = extractJsonLabelsAndIntervals(logs);

      setApiJsonLabels(labels);
      setApiLoaded(true);
      }
  }, [logs]);

  // Focused debug log for JSON labels


  // Compare localStorage and API for existed, new, and deleted
  function getJsonLabelSections(apiLabels, localState) {
    const apiMap = {};
    apiLabels.forEach(opt => { apiMap[opt.value] = opt; });
    const localKeys = Object.keys(localState || {});
    // Existed: in both
    const existed = localKeys.filter(label => apiMap[label]);
    // Newly added: in API, not in local, deduplicated by label
    const newlyAddedMap = {};
    apiLabels.forEach(opt => {
      if (!localState[opt.value] && !newlyAddedMap[opt.value]) {
        newlyAddedMap[opt.value] = opt;
      }
    });
    const newlyAdded = Object.values(newlyAddedMap);
    // Deleted: in local, not in API
    const deleted = localKeys.filter(label => !apiMap[label]);
    return { existed, newlyAdded, deleted };
  }
  const { existed, newlyAdded, deleted } = getJsonLabelSections(apiJsonLabels, activeJsonLabels || {});

  // Add all newly added labels
  function handleAddAllNewJsonLabels() {
    setActiveJsonLabels(prev => {
      const updated = { ...prev };
      newlyAdded.forEach(opt => {
        updated[opt.value] = {};
        (opt.intervals || []).forEach(interval => {
          updated[opt.value][interval] = true;
        });
      });
      return updated;
    });
  }
  // Add one new label
  function handleAddNewJsonLabel(label, intervals) {
    setActiveJsonLabels(prev => ({
      ...prev,
      [label]: Object.fromEntries((intervals || []).map(i => [i, true]))
    }));
  }
  // Delete one label from localStorage
  function handleDeleteJsonLabel(label) {
    setActiveJsonLabels(prev => {
      const updated = { ...prev };
      delete updated[label];
      return updated;
    });
  }
  // Delete all deleted labels
  function handleDeleteAllDeletedJsonLabels() {
    setActiveJsonLabels(prev => {
      const updated = { ...prev };
      deleted.forEach(label => { delete updated[label]; });
      return updated;
    });
  }

  // Compute which JSON columns to show in the table
  const jsonColumnsToShow = apiLoaded
    ? apiJsonLabels.filter(parent => activeJsonLabels[parent.value]).flatMap(parent =>
        (parent.intervals || []).filter(interval => activeJsonLabels[parent.value]?.[interval]).map(interval => ({ parent, interval }))
      )
    : Object.keys(activeJsonLabels).flatMap(label =>
        Object.keys(activeJsonLabels[label] || {}).filter(interval => activeJsonLabels[label][interval]).map(interval => ({ parent: { label, value: label }, interval }))
  );

  // --- Unified Label List State and Persistence ---
  const UNIFIED_LABELS_ORDER_KEY = 'listview_unified_labels_order';

  // Helper: Build all available labels/intervals (not just active)
  function buildAllAvailableLabels() {
    const list = [];
    // Regular labels (unique)
    const seenRegular = new Set();
    commonColumnOptions.forEach(col => {
      if (!seenRegular.has(col.value)) {
        list.push({ type: 'regular', value: col.value, label: col.label });
        seenRegular.add(col.value);
      }
    });
    // JSON labels (unique, grouped by value)
    const seenJson = new Set();
    apiJsonLabels.forEach(parent => {
      if (!seenJson.has(parent.value)) {
        list.push({
          type: 'json',
          value: parent.value,
          label: parent.label,
          intervals: parent.intervals // [{interval, exists}]
        });
        seenJson.add(parent.value);
      }
    });
    // Do NOT add filtered data (trade) labels here
    return list;
  }

  // Helper: Get initial order from localStorage or default
  function getSavedUnifiedOrder(allLabels) {
    const saved = localStorage.getItem(UNIFIED_LABELS_ORDER_KEY);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        // Build a map for quick lookup
        const allLabelMap = {};
        allLabels.forEach(l => { allLabelMap[l.type + '_' + l.value] = l; });
        // Rebuild the list in the saved order
        const ordered = order
          .map(o => allLabelMap[o.type + '_' + o.value])
          .filter(Boolean);
        // Add any new labels not in saved order (append at end)
        const orderSet = new Set(order.map(o => o.type + '_' + o.value));
        const missing = allLabels.filter(l => !orderSet.has(l.type + '_' + l.value));
        return [...ordered, ...missing];
      } catch {
        return allLabels;
      }
    }
    return allLabels;
  }

  // Initialize workingLabelList with saved order and current available labels
  const [workingLabelList, setWorkingLabelList] = useState(() => getSavedUnifiedOrder(buildAllAvailableLabels()));
  const isDraggingRef = useRef(false);

  function onDragStart() {
    isDraggingRef.current = true;
  }
  function onDragEnd(result) {
    isDraggingRef.current = false;
    if (!result.destination) return;
    const items = Array.from(workingLabelList);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setWorkingLabelList(items);
  }

  // Only sync workingLabelList with available labels when not dragging
  useEffect(() => {
    if (isDraggingRef.current) return;
    const allLabels = buildAllAvailableLabels();
    setWorkingLabelList(prev => {
      const prevSet = new Set(prev.map(l => l.type + '_' + l.value));
      const allSet = new Set(allLabels.map(l => l.type + '_' + l.value));
      // Remove missing
      let filtered = prev.filter(l => allSet.has(l.type + '_' + l.value));
      // Add new
      const missing = allLabels.filter(l => !prevSet.has(l.type + '_' + l.value));
      const newList = [...filtered, ...missing];
      return newList;
    });
  }, [JSON.stringify(apiJsonLabels)]);

  // Helper: Check if both regular and interval labels are loaded
  function labelsReady(apiJsonLabels) {
    // At least one regular and one interval label must be present
    return commonColumnOptions.length > 0 && apiJsonLabels && apiJsonLabels.length > 0;
  }

  // On every apiJsonLabels change, rebuild workingLabelList using saved order
  useEffect(() => {
    const allLabels = buildAllAvailableLabels();
    setWorkingLabelList(getSavedUnifiedOrder(allLabels));
  }, [JSON.stringify(apiJsonLabels)]);

  // Auto-save removed - only save when Save button is clicked

  // --- MASTER CONTROLS ---
  const [showUnchecked, setShowUnchecked] = useState(false);
  const [allRegularChecked, setAllRegularChecked] = useState(false);
  const [intervalMasterChecked, setIntervalMasterChecked] = useState({});
  // Minimize regular labels state
  const [minimizeRegular, setMinimizeRegular] = useState(false);

  // Add state for master interval checkboxes
  useEffect(() => {
    const saved = localStorage.getItem('pair_stats_interval_master_checked');
    if (saved) {
      setIntervalMasterChecked(JSON.parse(saved));
    } else {
      masterIntervals.forEach(interval => setIntervalMasterChecked(prev => ({ ...prev, [interval]: true })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pair_stats_interval_master_checked', JSON.stringify(intervalMasterChecked));
  }, [intervalMasterChecked]);

  // Add state for master regular checkbox
  useEffect(() => {
    const saved = localStorage.getItem('pair_stats_all_regular_checked');
    if (saved) {
      setAllRegularChecked(JSON.parse(saved));
    } else {
      setAllRegularChecked(false); // Default to unchecked
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pair_stats_all_regular_checked', JSON.stringify(allRegularChecked));
  }, [allRegularChecked]);

  // Add state for show unchecked toggle
  useEffect(() => {
    const saved = localStorage.getItem('pair_stats_show_unchecked');
    if (saved) {
      setShowUnchecked(JSON.parse(saved));
    } else {
      setShowUnchecked(false); // Default to unchecked
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pair_stats_show_unchecked', JSON.stringify(showUnchecked));
  }, [showUnchecked]);

  // Draggable and resizable modal state
  const MODAL_POS_KEY = 'listview_settings_modal_pos';
  const MODAL_SIZE_KEY = 'listview_settings_modal_size';
  const getInitialModalPos = () => {
    const saved = localStorage.getItem(MODAL_POS_KEY);
    let pos = { x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') pos = parsed;
      } catch {}
    }
    // Clamp to viewport only if offscreen
    const size = getInitialModalSize();
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    let width = Math.min(size.width, maxW);
    let height = Math.min(size.height, maxH);
    let x = Math.max(0, Math.min(maxW - width, pos.x));
    let y = pos.y;
    if (y < 0) y = 0;
    if (y > maxH - 48) y = maxH - 48;
    return { x, y };
  };
  const getInitialModalSize = () => {
    const saved = localStorage.getItem(MODAL_SIZE_KEY);
    let size = { width: 700, height: 500 };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') size = parsed;
      } catch {}
    }
    // Clamp to viewport
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    return { width: Math.min(size.width, maxW), height: Math.min(size.height, maxH) };
  };
  const [modalPos, setModalPos] = useState(getInitialModalPos);
  const [modalSize, setModalSize] = useState(getInitialModalSize);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Enhanced drag logic: clamp position so modal never goes offscreen (header always visible)
  function onModalMouseDown(e) {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - modalPos.x,
      y: e.clientY - modalPos.y,
    };
    document.body.style.userSelect = 'none';
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging) return;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const modal = document.querySelector('[role="dialog"][aria-label="Settings"]');
      let width = modal ? modal.offsetWidth : modalSize.width;
      let height = modal ? modal.offsetHeight : modalSize.height;
      const minVisibleW = Math.floor(0.05 * width);
      const headerHeight = 48;
      let newX = Math.max(-width + minVisibleW, Math.min(maxW - minVisibleW, e.clientX - dragOffset.current.x));
      let newY = Math.max(headerHeight * -0.9, Math.min(maxH - 48, e.clientY - dragOffset.current.y));
      setModalPos({ x: newX, y: newY });
    }
    function onMouseUp() {
      setDragging(false);
      document.body.style.userSelect = '';
    }
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, modalPos, modalSize]);

  // Custom resize handle logic (save size to localStorage)
  const modalRef = useRef(null);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  function onResizeMouseDown(e) {
    e.stopPropagation();
    setResizing(true);
    const modal = modalRef.current;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: modal ? modal.offsetWidth : modalSize.width,
      height: modal ? modal.offsetHeight : modalSize.height,
    };
    document.body.style.userSelect = 'none';
  }
  useEffect(() => {
    function onResizeMove(e) {
      if (!resizing) return;
      const maxW = window.innerWidth - modalPos.x;
      const maxH = window.innerHeight - modalPos.y;
      let newWidth = Math.max(200, Math.min(maxW, resizeStart.current.width + (e.clientX - resizeStart.current.x)));
      let newHeight = Math.max(100, Math.min(maxH, resizeStart.current.height + (e.clientY - resizeStart.current.y)));
      setModalSize({ width: newWidth, height: newHeight });
      const modal = modalRef.current;
      if (modal) {
        modal.style.width = newWidth + 'px';
        modal.style.height = newHeight + 'px';
      }
    }
    function onResizeUp() {
      setResizing(false);
      document.body.style.userSelect = '';
    }
    if (resizing) {
      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup', onResizeUp);
    }
    return () => {
      window.removeEventListener('mousemove', onResizeMove);
      window.removeEventListener('mouseup', onResizeUp);
    };
  }, [resizing, modalPos, modalSize]);
  // Save modal size to localStorage
  useEffect(() => {
    localStorage.setItem(MODAL_SIZE_KEY, JSON.stringify(modalSize));
  }, [modalSize]);

  // Clamp modal position and size to viewport on window resize or zoom
  useEffect(() => {
    function clampModalToViewport() {
      const modal = document.querySelector('[role="dialog"][aria-label="Settings"]');
      if (!modal) return;
      const rect = modal.getBoundingClientRect();
      let newX = modalPos.x;
      let newY = modalPos.y;
      let newWidth = rect.width;
      let newHeight = rect.height;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const headerHeight = 48;
      const minVisibleW = Math.floor(0.05 * rect.width);
      const minVisibleH = Math.floor(0.05 * rect.height);
      if (rect.right > maxW - minVisibleW) newX = Math.max(0, maxW - minVisibleW - rect.width);
      if (rect.bottom > maxH - minVisibleH) newY = Math.max(headerHeight, maxH - minVisibleH - rect.height);
      if (rect.left < -rect.width + minVisibleW) newX = -rect.width + minVisibleW;
      if (rect.top < -rect.height + minVisibleH) newY = -rect.height + minVisibleH;
      if (rect.width > maxW) newWidth = maxW;
      if (rect.height > maxH) newHeight = maxH;
      if (newX !== modalPos.x || newY !== modalPos.y) setModalPos({ x: newX, y: newY });
      if (modal.style) {
        modal.style.maxWidth = maxW + 'px';
        modal.style.maxHeight = maxH + 'px';
        if (rect.width > maxW) modal.style.width = maxW + 'px';
        if (rect.height > maxH) modal.style.height = maxH + 'px';
      }
    }
    window.addEventListener('resize', clampModalToViewport);
    clampModalToViewport();
    return () => window.removeEventListener('resize', clampModalToViewport);
  }, [modalPos]);

  // Save modal position to localStorage
  useEffect(() => {
    localStorage.setItem(MODAL_POS_KEY, JSON.stringify(modalPos));
  }, [modalPos]);

  // Modal open/close animation state
  const [modalVisible, setModalVisible] = useState(false);

  // Modal scale state
  const MODAL_SCALE_KEY = 'listview_settings_modal_scale';
  const [modalScale, setModalScale] = useState(() => {
    const saved = localStorage.getItem(MODAL_SCALE_KEY);
    return saved ? parseFloat(saved) : 1.0;
  });
  useEffect(() => {
    localStorage.setItem(MODAL_SCALE_KEY, modalScale);
  }, [modalScale]);

  // Animate modal open/close
  useEffect(() => {
    if (settingsOpen) {
      setModalVisible(true);
    } else {
      // Delay unmount for animation
      const timeout = setTimeout(() => setModalVisible(false), 180);
      return () => clearTimeout(timeout);
    }
  }, [settingsOpen]);

  // Save settings modal open state to localStorage
  useEffect(() => {
    localStorage.setItem('listview_settings_modal_open', JSON.stringify(settingsOpen));
  }, [settingsOpen]);

  // ESC key closes modal
  useEffect(() => {
    function onKeyDown(e) {
      if (settingsOpen && e.key === 'Escape') setSettingsOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen]);

  // Opacity state for modal
  const [modalOpacity, setModalOpacity] = useState(() => {
    const saved = localStorage.getItem('listview_settings_modal_opacity');
    return saved ? parseFloat(saved) : 1.0;
  });
  useEffect(() => {
    localStorage.setItem('listview_settings_modal_opacity', modalOpacity);
  }, [modalOpacity]);

  // Label font size and wrap state
  const [labelFontSize, setLabelFontSize] = useState(() => {
    const saved = localStorage.getItem('listview_label_font_size');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [wrapLabels, setWrapLabels] = useState(() => {
    const saved = localStorage.getItem('listview_label_wrap');
    return saved ? JSON.parse(saved) : false;
  });
  useEffect(() => {
    localStorage.setItem('listview_label_font_size', labelFontSize);
  }, [labelFontSize]);
  useEffect(() => {
    localStorage.setItem('listview_label_wrap', JSON.stringify(wrapLabels));
  }, [wrapLabels]);

  // Sticky filter bar hide/show state
  const [filterBarVisible, setFilterBarVisible] = useState(() => {
    const saved = localStorage.getItem('listview_filter_bar_visible');
    return saved ? JSON.parse(saved) : true;
  });
  useEffect(() => {
    localStorage.setItem('listview_filter_bar_visible', JSON.stringify(filterBarVisible));
  }, [filterBarVisible]);

  // Save handler for label order and checkbox state
  function handleSaveSettings() {
    const toSave = workingLabelList.map(l => ({ type: l.type, value: l.value }));
    localStorage.setItem(UNIFIED_LABELS_ORDER_KEY, JSON.stringify(toSave));
    localStorage.setItem(REGULAR_LABELS_KEY, JSON.stringify(activeRegularLabels));
    localStorage.setItem(JSON_LABELS_KEY, JSON.stringify(activeJsonLabels));
    
    // Show confirmation message
    const confirmation = document.createElement('div');
    confirmation.textContent = '✅ Settings saved successfully!';
    confirmation.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #22c55e;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(confirmation);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (confirmation.parentNode) {
        confirmation.parentNode.removeChild(confirmation);
      }
    }, 3000);
  }

  // Replace sortKey with an object
  const [sortKey, setSortKey] = useState(null); // { type, key, parentKey, interval }
  const [sortDirection, setSortDirection] = useState('asc');

  // Enhanced sort handler
  const handleHeaderClick = (type, key, parentKey = null, interval = null) => {
    // Build a sortKey object
    const newSortKey = { type, key, parentKey, interval };
    if (sortKey && JSON.stringify(sortKey) === JSON.stringify(newSortKey)) {
      setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'));
      } else {
      setSortKey(newSortKey);
      setSortDirection('asc');
    }
  };

  // Helper to extract value for sorting
  const extractSortValue = (row, sortKeyObj) => {
    if (!sortKeyObj) return undefined;
    const { type, key, parentKey, interval } = sortKeyObj;
    if (type === 'regular') {
      return row[key];
    }
    if (type === 'trade') {
      return tradesByUniqueId[row.Unique_id]?.[key];
    }
    if (type === 'json' && parentKey && interval) {
      let json = {};
      try {
        if (typeof row.json_data === 'string') {
          let raw = row.json_data.replace(/\bNaN\b|\bInfinity\b|\b-Infinity\b/g, 'null');
          json = JSON.parse(raw);
          } else {
          json = row.json_data || {};
        }
      } catch { json = {}; }
      const allRows = json?.signal_data?.all_last_rows || {};
      return allRows[interval]?.[parentKey];
    }
    return undefined;
  };

  // Enhanced sort function
  const getSortedRows = (rows) => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      let aVal = extractSortValue(a, sortKey);
      let bVal = extractSortValue(b, sortKey);
      // Special handling for date/time fields in regular columns
      if (sortKey.type === 'regular' && isDateField(sortKey.key)) {
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          if (aDate < bDate) return sortDirection === 'asc' ? -1 : 1;
          if (aDate > bDate) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        }
      }
      // Try to parse as number, else compare as string
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      aVal = aVal == null ? '' : String(aVal);
      bVal = bVal == null ? '' : String(bVal);
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Add state for selected row
  const [selectedRow, setSelectedRow] = useState(null);

  // Helper to reset modal position, size, and scale
  function resetModalSettings() {
    // Default size
    const defaultSize = { width: 700, height: 500 };
    // Center position based on current window and modal size
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const x = Math.max(0, Math.floor((maxW - defaultSize.width) / 2));
    const y = Math.max(0, Math.floor((maxH - defaultSize.height) / 2));
    setModalPos({ x, y });
    setModalSize(defaultSize);
    setModalScale(1.0);
    localStorage.setItem(MODAL_POS_KEY, JSON.stringify({ x, y }));
    localStorage.setItem(MODAL_SIZE_KEY, JSON.stringify(defaultSize));
    localStorage.setItem(MODAL_SCALE_KEY, '1.0');
  }

  // Add dragOverIndex state to ListViewPage
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Add state for spacing control with localStorage persistence
  const FILTER_TABLE_SPACING_KEY = 'listview_filter_table_spacing';
  const [filterTableSpacing, setFilterTableSpacing] = useState(() => {
    const saved = localStorage.getItem(FILTER_TABLE_SPACING_KEY);
    return saved ? parseInt(saved) : 0;
  });
  useEffect(() => {
    localStorage.setItem(FILTER_TABLE_SPACING_KEY, filterTableSpacing.toString());
  }, [filterTableSpacing]);

  return (
    <div className={darkMode ? 'dark' : ''} style={{ minHeight: '100vh', background: darkMode ? '#181a20' : '#f7f7fa' }}>
      {/* Font Controls and Wrap Labels - Above Settings Button */}
      <div style={{ position: 'absolute', top: 8, right: 200, zIndex: 100, display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Spacing control buttons */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <span style={{ opacity: 0.7 }}>Spacing</span>
          <button 
            onClick={() => setFilterTableSpacing(prev => prev - 4)} 
            style={{ 
              padding: '2px 6px', 
              fontSize: 12, 
              borderRadius: 3, 
              border: '1px solid #888', 
              background: darkMode ? '#23272f' : '#fff', 
              color: darkMode ? '#fff' : '#222', 
              cursor: 'pointer' 
            }}
            title="Reduce space between filters and table"
          >
            ↓
          </button>
          <button 
            onClick={() => setFilterTableSpacing(prev => Math.min(100, prev + 4))} 
            style={{ 
              padding: '2px 6px', 
              fontSize: 12, 
              borderRadius: 3, 
              border: '1px solid #888', 
              background: darkMode ? '#23272f' : '#fff', 
              color: darkMode ? '#fff' : '#222', 
              cursor: 'pointer' 
            }}
            title="Increase space between filters and table"
          >
            ↑
          </button>
          <span style={{ width: 28, textAlign: 'right', opacity: 0.7, fontSize: 12 }}>{filterTableSpacing}px</span>
        </label>
        {/* Table font size adjuster */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <span style={{ opacity: 0.7 }}>Table Font</span>
          <button onClick={() => setFontSize(f => Math.max(0.7, f - 0.1))} style={{ padding: '2px 6px', fontSize: 12, borderRadius: 3, border: '1px solid #888', background: darkMode ? '#23272f' : '#fff', color: darkMode ? '#fff' : '#222', cursor: 'pointer' }}>A−</button>
          <button onClick={() => setFontSize(f => Math.min(2, f + 0.1))} style={{ padding: '2px 6px', fontSize: 12, borderRadius: 3, border: '1px solid #888', background: darkMode ? '#23272f' : '#fff', color: darkMode ? '#fff' : '#222', cursor: 'pointer' }}>A+</button>
          <span style={{ width: 28, textAlign: 'right', opacity: 0.7, fontSize: 12 }}>{Math.round(fontSize * 100)}%</span>
        </label>
        {/* Label font size adjuster */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <span style={{ opacity: 0.7 }}>Label Font</span>
          <button onClick={() => setLabelFontSize(f => Math.max(0.7, f - 0.1))} style={{ padding: '2px 6px', fontSize: 12, borderRadius: 3, border: '1px solid #888', background: darkMode ? '#23272f' : '#fff', color: darkMode ? '#fff' : '#222', cursor: 'pointer' }}>A−</button>
          <button onClick={() => setLabelFontSize(f => Math.min(2, f + 0.1))} style={{ padding: '2px 6px', fontSize: 12, borderRadius: 3, border: '1px solid #888', background: darkMode ? '#23272f' : '#fff', color: darkMode ? '#fff' : '#222', cursor: 'pointer' }}>A+</button>
          <span style={{ width: 28, textAlign: 'right', opacity: 0.7, fontSize: 12 }}>{Math.round(labelFontSize * 100)}%</span>
        </label>
        {/* Wrap label text button */}
        <button
          onClick={() => setWrapLabels(w => !w)}
          style={{
            padding: '3px 10px',
            borderRadius: 4,
            border: '1px solid #888',
            fontWeight: 600,
            fontSize: 12,
            background: wrapLabels ? (darkMode ? '#0ea5e9' : '#0d9488') : (darkMode ? '#23272f' : '#fff'),
            color: wrapLabels ? '#fff' : (darkMode ? '#fff' : '#222'),
            cursor: 'pointer',
            boxShadow: wrapLabels ? '0 2px 8px #0ea5e944' : '0 2px 8px #8882',
            transition: 'background 0.2s',
          }}
          title="Wrap label text at word boundaries"
        >
          {wrapLabels ? 'Unwrap Labels' : 'Wrap Labels'}
        </button>
      </div>
      
      {/* Back to Grid button */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 100 }}>
        <button
          onClick={() => window.location.href = '/reports'}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: 24, 
            color: darkMode ? '#fff' : '#222',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          aria-label="Back to Grid Reports"
          title="Back to Grid Reports"
        >
          <span role="img" aria-label="back to grid">📊</span>
        </button>
      </div>
      {/* Settings button */}
      <div style={{ position: 'absolute', top: 24, right: 80, zIndex: 100, display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Reset button */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to reset the settings screen? Yes / No')) {
              resetModalSettings();
            }
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: darkMode ? '#fff' : '#222', marginRight: 2 }}
          aria-label="Reset Settings"
          title="Reset Settings Screen"
        >
          <span role="img" aria-label="reset">🔄</span>
        </button>
        {/* Settings (gear) button */}
        <button
          onClick={() => setSettingsOpen(open => !open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, color: darkMode ? '#fff' : '#222' }}
          aria-label={settingsOpen ? 'Close Settings' : 'Open Settings'}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
        >
          <span role="img" aria-label="settings">⚙️</span>
        </button>
      </div>
      {/* Modal overlay and modal */}
      {modalVisible && (
        <>
          {/* Overlay (transparent to pointer events, does not block interaction) */}
        <div
          style={{
            position: 'fixed',
              top: 0,
            left: 0,
            width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.10)',
              zIndex: 199,
              transition: 'opacity 0.18s',
              opacity: settingsOpen ? 1 : 0,
              pointerEvents: 'none', // allow interaction with dashboard
            }}
            aria-hidden="true"
          />
          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            style={{
              position: 'fixed',
              top: modalPos.y,
              left: modalPos.x,
              minHeight: 100,
              minWidth: 200,
              zIndex: 200,
              width: modalSize.width,
            maxWidth: '100vw',
              background: darkMode ? `rgba(35,39,47,${modalOpacity})` : `rgba(255,255,255,${modalOpacity})`,
            color: darkMode ? '#fff' : '#222',
            borderRadius: 18,
            boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
              height: modalSize.height,
              maxHeight: '100vh',
              margin: '0 auto',
              boxSizing: 'border-box',
              resize: 'none', // disable native resize, use custom
              overflow: 'auto',
              cursor: dragging ? 'move' : 'default',
              opacity: settingsOpen ? 1 : 0,
              transform: settingsOpen ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.18s, transform 0.18s',
              pointerEvents: settingsOpen ? 'auto' : 'none',
            }}
          >
            {/* Modal scale wrapper */}
            <div style={{ width: '100%', height: '100%', transform: `scale(${modalScale})`, transformOrigin: 'top left' }}>
            {/* Custom resize handle (bottom-right corner) */}
            <div
              onMouseDown={onResizeMouseDown}
              style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
                width: 22,
                height: 22,
                zIndex: 10,
                cursor: 'nwse-resize',
                background: 'transparent',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                userSelect: 'none',
              }}
              title="Resize"
            >
              <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="6,22 22,22 22,6" style={{ fill: 'none', stroke: darkMode ? '#38bdf8' : '#0ea5e9', strokeWidth: 2 }} /></svg>
            </div>
            {/* Sticky header, draggable, with master controls */}
            <div
              style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: darkMode ? '#23272f' : '#fff',
            zIndex: 2,
                padding: 12,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
                cursor: 'move',
                userSelect: 'none',
                gap: 8,
              }}
              onMouseDown={onModalMouseDown}
            >
              {/* Modal scale slider */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginRight: 12 }}>
                <span style={{ opacity: 0.7 }}>Modal Scale</span>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.01}
                  value={modalScale}
                  onChange={e => setModalScale(parseFloat(e.target.value))}
                  style={{ width: 70 }}
                />
                <span style={{ width: 32, textAlign: 'right', opacity: 0.7 }}>{Math.round(modalScale * 100)}%</span>
              </label>
              {/* Master controls in header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Opacity adjuster */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <span style={{ opacity: 0.7 }}>Opacity</span>
                  <input
                    type="range"
                    min={0.3}
                    max={1}
                    step={0.01}
                    value={modalOpacity}
                    onChange={e => setModalOpacity(parseFloat(e.target.value))}
                    style={{ width: 70 }}
                  />
                  <span style={{ width: 32, textAlign: 'right', opacity: 0.7 }}>{Math.round(modalOpacity * 100)}%</span>
                </label>
                <button
                  onClick={() => setMinimizeRegular(m => !m)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 14,
                    background: minimizeRegular ? '#0ea5e9' : '#334155',
                    color: '#fff',
                    boxShadow: minimizeRegular ? '0 2px 8px #0ea5e944' : '0 2px 8px #33415544',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {minimizeRegular ? 'Show Regular Labels' : 'Minimize Regular Labels'}
                </button>
                    <button
                onClick={() => setShowUnchecked(s => !s)}
                      style={{
                    padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        fontWeight: 600,
                    fontSize: 14,
                    background: showUnchecked ? '#22c55e' : '#ef4444',
                  color: '#fff',
                  boxShadow: showUnchecked ? '0 2px 8px #22c55e44' : '0 2px 8px #ef444444',
                        cursor: 'pointer',
                  transition: 'background 0.2s',
                      }}
                    >
                {showUnchecked ? 'Show Unchecked' : 'Hide Unchecked'}
                    </button>
                    <button
                onClick={() => {
                  if (!allRegularChecked) {
                    setActiveRegularLabels(commonColumnOptions.map(opt => opt.value));
                  } else {
                    setActiveRegularLabels([]);
                  }
                  setAllRegularChecked(c => !c);
                }}
                style={{
                    padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontWeight: 600,
                    fontSize: 14,
                    background: allRegularChecked ? '#22c55e' : '#ef4444',
                  color: '#fff',
                  boxShadow: allRegularChecked ? '0 2px 8px #22c55e44' : '0 2px 8px #ef444444',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {allRegularChecked ? 'Uncheck All Regular' : 'Check All Regular'}
              </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: 8 }}>
                  <span style={{ fontWeight: 500, marginRight: 4 }}>Intervals:</span>
                {masterIntervals.map(interval => (
                    <label key={interval} style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 36 }}>
                    <input
                      type="checkbox"
                      checked={intervalMasterChecked[interval] || false}
                      onChange={e => {
                        const checked = e.target.checked;
                        setIntervalMasterChecked({
                          ...intervalMasterChecked,
                          [interval]: checked
                        });
                        setActiveJsonLabels(prev => {
                          const updated = { ...prev };
                          apiJsonLabels.forEach(parent => {
                              if (parent.intervals.some(i => i.interval === interval && i.exists)) {
                              updated[parent.value] = {
                                ...updated[parent.value],
                                [interval]: checked
                              };
                            }
                          });
                          return updated;
                        });
                      }}
                        style={{ transform: 'scale(1.05)' }}
                    />
                      <span style={{ fontSize: 13 }}>{interval}</span>
                  </label>
                ))}
          </div>
                {/* Save button in settings modal header */}
                <button
                  onClick={handleSaveSettings}
                  style={{
                    padding: '6px 18px',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 15,
                    background: '#22c55e',
                    color: '#fff',
                    boxShadow: '0 2px 8px #22c55e44',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    marginLeft: 8,
                  }}
                  title="Save label order and checkbox state"
                >
                  Save
                </button>
          </div>
              <button onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'inherit', cursor: 'pointer', marginLeft: 12 }} aria-label="Close">✕</button>
            </div>
            {/* Scrollable body */}
            <div style={{
              overflowY: 'auto',
              padding: 32,
              flex: 1,
              minHeight: 0,
              position: 'relative',
            }}>
            <DndProvider backend={HTML5Backend}>
              {/* Set direction to 'vertical' to enforce vertical-only drag */}
                {/* Render the draggable label list with filtering at the map level for Hide Unchecked */}
              <DroppableLabelList
                items={workingLabelList}
                moveLabel={(from, to) => {
                  setWorkingLabelList(prev => {
                    const updated = [...prev];
                    const [removed] = updated.splice(from, 1);
                    updated.splice(to, 0, removed);
                    return updated;
                  });
                }}
                renderRow={(item, idx) => {
                  // Determine if this label should be visible
                  let isVisible = true;
                  if (item.type === 'regular') {
                    if (minimizeRegular) isVisible = false;
                    if (!showUnchecked && !activeRegularLabels.includes(item.value)) isVisible = false;
                  }
                  if (item.type === 'json' && Array.isArray(item.intervals)) {
                    const hasVisible = item.intervals.some(({ interval }) =>
                      !showUnchecked || !!activeJsonLabels?.[item.value]?.[interval]
                    );
                    if (!hasVisible) isVisible = false;
                  }
                  // Render the label row, but hide if not visible
                  return (
                    <div style={{ display: isVisible ? undefined : 'none', width: '100%' }}>
                      {/* Existing label content */}
                      {item.type === 'regular' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={activeRegularLabels.includes(item.value)}
                            onChange={e => {
                              if (e.target.checked) setActiveRegularLabels([...activeRegularLabels, item.value]);
                              else setActiveRegularLabels(activeRegularLabels.filter(v => v !== item.value));
                            }}
                          />
                          {item.label}
                        </label>
                      )}
                      {item && item.type === 'json' && Array.isArray(item.intervals) && (() => {
                        const visibleIntervals = (item.intervals || []).filter(({ interval }) =>
                          !showUnchecked || !!activeJsonLabels?.[item.value]?.[interval]
                        );
                        if (visibleIntervals.length === 0) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', marginBottom: 1, lineHeight: 1.2 }}>
                              <span style={{ fontWeight: 500, fontSize: '0.95em' }}>{item.label}</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 0, alignItems: 'flex-start', lineHeight: 1 }}>
                              {visibleIntervals.map(({ interval, exists }) => (
                                <label key={item.value + '_' + interval} style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 40, opacity: exists ? 1 : 0.5, padding: '1px 0', lineHeight: 1 }}>
                                  <input
                                    type="checkbox"
                                    checked={!!activeJsonLabels?.[item.value]?.[interval]}
                                    disabled={!exists}
                                    onChange={e => {
                                      setActiveJsonLabels(prev => ({
                                        ...prev,
                                        [item.value]: {
                                          ...prev[item.value],
                                          [interval]: e.target.checked
                                        }
                                      }));
                                    }}
                                    style={{ transform: 'scale(0.9)' }}
                                  />
                                  <span style={{ fontSize: '0.8em', fontWeight: 500, lineHeight: 1 }}>{interval}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
                activeJsonLabels={activeJsonLabels}
                setActiveJsonLabels={setActiveJsonLabels}
                showUnchecked={showUnchecked}
                dragOverIndex={dragOverIndex}
                setDragOverIndex={setDragOverIndex}
              />
            </DndProvider>
          </div>
            </div>
          </div>
        </>
      )}
      {logsLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: darkMode ? '#23272f' : '#fff', color: darkMode ? '#fff' : '#222', padding: 32, borderRadius: 16, fontSize: 22, fontWeight: 600, boxShadow: '0 4px 32px rgba(0,0,0,0.18)' }}>
            Loading logs...
          </div>
        </div>
      )}
      {/* Font size adjust buttons */}
      <div style={{ position: 'absolute', top: 24, right: 130, zIndex: 100, display: 'flex', gap: 4 }}>

      </div>
      {/* Settings Modal (full-width, responsive) */}
      {/* REMOVE: All code that references settingsOpen, setSettingsOpen, the settings button, and the settings modal rendering. */}
      {/* Dark/Bright mode toggle button */}
      <button
        onClick={() => setDarkMode(dm => !dm)}
        style={{ position: 'absolute', right: 32, top: 24, zIndex: 100, padding: 8, borderRadius: '50%', background: darkMode ? '#222' : '#fff', color: darkMode ? '#fff' : '#222', border: '1.5px solid #888', fontSize: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? '🌞' : '🌙'}
      </button>
      {/* Main content container: filter/grid and table together */}
      <div style={{ 
        padding: '0 64px 0 32px', // Removed top and bottom padding completely
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        boxSizing: 'border-box'
      }}>
      <ListViewComponent
        pair={pair}
        interval={interval}
        candleType={candleType}
        onBack={() => window.close()}
        gridPreview={gridPreview}
        filterBar={filterBar}
        trades={filteredTrades}
        darkMode={darkMode}
        // Add more props as needed
      />
        {/* Table: attractive styling similar to main dashboard */}
        <div style={{ margin: `${filterTableSpacing}px 0 0 0` }}> {/* Dynamic spacing based on state */}
          <div style={{ 
            color: darkMode ? '#fff' : '#222', 
            margin: '8px 0 16px 0',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}>
            {/* Left side info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <span>📊</span>
              <span>Rows: {filteredLogs.length} of {totalLogs}</span>
              <span>•</span>
              <span>Page: {currentPage} of {totalPages}</span>
            <span>•</span>
            <span>Columns: {commonColumnOptions.length + apiJsonLabels.reduce((acc, parent) => acc + (parent.intervals?.length || 0), 0) + tradeDataColumnOptions.length}</span>
              
              {/* Candle Pattern Filter Checkboxes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedCandleTypes.Regular}
                    onChange={(e) => setSelectedCandleTypes(prev => ({ ...prev, Regular: e.target.checked }))}
                    style={{ transform: 'scale(1.1)' }}
                  />
                  <span>Regular</span>
                  <span style={{ 
                    fontSize: 11, 
                    opacity: 0.7, 
                    color: selectedCandleTypes.Regular ? '#22c55e' : '#6b7280',
                    fontWeight: 600 
                  }}>
                    ({candleTypeCounts.Regular})
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedCandleTypes.Heiken}
                    onChange={(e) => setSelectedCandleTypes(prev => ({ ...prev, Heiken: e.target.checked }))}
                    style={{ transform: 'scale(1.1)' }}
                  />
                  <span>Heiken</span>
                  <span style={{ 
                    fontSize: 11, 
                    opacity: 0.7, 
                    color: selectedCandleTypes.Heiken ? '#22c55e' : '#6b7280',
                    fontWeight: 600 
                  }}>
                    ({candleTypeCounts.Heiken})
                  </span>
                </label>
                <span style={{ 
                  fontSize: 12, 
                  opacity: 0.7, 
                  color: filteredLogs.length === 0 ? '#ef4444' : '#22c55e',
                  fontWeight: 600 
                }}>
                  ({filteredLogs.length} shown)
                </span>
                {candleTypeCounts.Unknown > 0 && (
                  <span style={{ 
                    fontSize: 11, 
                    opacity: 0.5, 
                    color: '#f59e0b',
                    fontWeight: 600 
                  }}>
                    ({candleTypeCounts.Unknown} unknown)
                  </span>
                )}
              </div>

              {/* Time Range Display */}
              {filteredLogs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                  <span style={{ opacity: 0.7 }}>Time Range:</span>
                  <span style={{ fontWeight: 600, color: darkMode ? '#0ea5e9' : '#0d9488' }}>
                    {filteredLogs[0]?.Candle_Time ? formatDate(filteredLogs[0].Candle_Time) : 'N/A'}
                  </span>
                  <span>to</span>
                  <span style={{ fontWeight: 600, color: darkMode ? '#0ea5e9' : '#0d9488' }}>
                    {filteredLogs[filteredLogs.length - 1]?.Candle_Time ? formatDate(filteredLogs[filteredLogs.length - 1].Candle_Time) : 'N/A'}
                  </span>
                </div>
              )}
            </div>

            {/* Right side pagination controls - Same horizontal line */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              {/* Rows Per Page Input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                background: darkMode ? '#1e293b' : '#f1f5f9',
                borderRadius: 6,
                border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  color: darkMode ? '#fff' : '#222', 
                  fontSize: 12 
                }}>
                  Rows:
                </span>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={logsPerPage}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 10 && value <= 5000) {
                      setLogsPerPage(value);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRowsPerPageChange(logsPerPage);
                    }
                  }}
                  onBlur={() => handleRowsPerPageChange(logsPerPage)}
                    style={{
                    width: 50,
                    padding: '2px 4px',
                    borderRadius: 3,
                    border: '1px solid #888',
                    background: darkMode ? '#23272f' : '#fff',
                    color: darkMode ? '#fff' : '#222',
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                />
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  background: darkMode ? '#1e293b' : '#f1f5f9',
                      borderRadius: 6,
                  border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                }}>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #888',
                      fontWeight: 600,
                      fontSize: 11,
                      background: currentPage === 1 ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                      color: currentPage === 1 ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #888',
                      fontWeight: 600,
                      fontSize: 11,
                      background: currentPage === 1 ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                      color: currentPage === 1 ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    ←
                  </button>
                  
                  <span style={{ fontWeight: 600, color: darkMode ? '#fff' : '#222', fontSize: 12 }}>
                    {currentPage}/{totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #888',
                      fontWeight: 600,
                      fontSize: 11,
                      background: currentPage === totalPages ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                      color: currentPage === totalPages ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    →
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #888',
                      fontWeight: 600,
                      fontSize: 11,
                      background: currentPage === totalPages ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                      color: currentPage === totalPages ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          </div>
                </div>


          
          {/* Adjust Modal (draggable, checkable list) */}
          {/* REMOVE: All code that references adjustModalOpen, setAdjustModalOpen, and related modal open/close logic. */}
          
          {/* Beautiful table container */}
          <div className="overflow-auto border border-gray-300 rounded-lg" style={{
            background: darkMode ? '#181a20' : '#f5ecd7',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: darkMode ? '1px solid #334155' : '1px solid #d1d5db',
            fontSize: `${fontSize}em`, // Apply font size here
            position: 'relative',
            flex: 1,
            minHeight: 0, // Important for flex child
          }}>
            {/* Font/label controls below sticky filter bar, above table */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '16px 0 8px 0',
            paddingLeft: 8,
            paddingRight: 8,
          }}>
            {/* Left side controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}>
  {/* Table font size adjuster (existing) */}
 
  {/* Wrap label text button */}
 
</div>
            <table className="w-full border-collapse" style={{ fontSize: 'inherit', color: darkMode ? '#fff' : '#222' }}>
              {/* --- Table Header Rendering --- */}
              {/* Always use workingLabelList for parent column order */}
              <thead className="sticky top-0 z-30" style={{
                background: darkMode ? '#0f766e' : '#0d9488',
                color: 'white',
  fontSize: 'inherit',
  zIndex: 30,
}}>
  <tr style={{ position: 'sticky', top: 0, zIndex: 31, background: darkMode ? '#0f766e' : '#0d9488' }}>
    {workingLabelList.map((item, parentIdx) => {
      // Alternate color for parent label columns
      const isParent = item.type === 'json' && Array.isArray(item.intervals);
      const parentBg = isParent
        ? (parentIdx % 2 === 0 ? (darkMode ? '#1e293b' : '#e0e7ef') : (darkMode ? '#334155' : '#f1f5f9'))
        : undefined;
                    if (item.type === 'regular' && activeRegularLabels.includes(item.value)) {
        const isSticky = parentIdx === 0 || parentIdx === 1;
        const regularBg = darkMode ? '#5eead4' : '#e0fcf7';
                      return (
                        <th key={item.value} rowSpan={2} className="relative px-4 py-3 text-left cursor-pointer whitespace-nowrap" style={{
            fontSize: `${labelFontSize}em`,
                          fontWeight: '600',
                          borderBottom: '2px solid rgba(255,255,255,0.2)',
            color: '#111',
            background: regularBg,
            minWidth: 120,
            overflow: 'visible',
            whiteSpace: wrapLabels ? 'normal' : 'nowrap',
            wordBreak: wrapLabels ? 'break-word' : 'normal',
            position: isSticky ? 'sticky' : undefined,
            left: isSticky ? (parentIdx === 0 ? 0 : 120) : undefined,
            zIndex: isSticky ? 40 : undefined,
          }} title={item.label}
                          onClick={() => handleHeaderClick('regular', item.value)}>
                          <div className="flex items-center justify-between">
                            <span>{item.label}</span>
                            <span className="ml-1 opacity-60">
                              {sortKey && sortKey.type === 'regular' && sortKey.key === item.value ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                            </span>
                          </div>
                        </th>
                      );
                    }
      if (isParent) {
        const checkedIntervals = item.intervals.filter(({ interval }) => !!activeJsonLabels[item.value]?.[interval]);
                      if (checkedIntervals.length === 0) return null;
        // Alternate color for interval parent label headers (not turquoise or black)
        const parentHeaderBg = parentIdx % 2 === 0
          ? (darkMode ? '#fbbf24' : '#ffe082')
          : (darkMode ? '#fb923c' : '#ffd6a5');
                      return (
                        <th key={item.value} colSpan={checkedIntervals.length} className="relative px-4 py-3 text-left whitespace-nowrap" style={{
            fontSize: `${labelFontSize}em`,
            fontWeight: 'bold',
                          borderBottom: '2px solid rgba(255,255,255,0.2)',
            color: '#111',
            background: parentHeaderBg,
            minWidth: 120,
            overflow: 'visible',
            whiteSpace: wrapLabels ? 'normal' : 'nowrap',
            wordBreak: wrapLabels ? 'break-word' : 'normal',
          }} title={item.label}>
                          <div className="flex items-center justify-between">
                            <span>{item.label}</span>
                          </div>
                        </th>
                      );
                    }
                    return null;
                  })}
                  {/* No extra row for regular or trade columns */}
                </tr>
                <tr>
    {workingLabelList.map((item, parentIdx) => {
                    if (item.type === 'json' && Array.isArray(item.intervals)) {
        const checkedIntervals = item.intervals.filter(({ interval }) => !!activeJsonLabels[item.value]?.[interval]);
        // Use the same parentBg for all intervals of this parent
        const parentBg = (parentIdx % 2 === 0 ? (darkMode ? '#1e293b' : '#e0e7ef') : (darkMode ? '#334155' : '#f1f5f9'));
        return checkedIntervals.map(({ interval }) => (
                        <th key={item.value + '_' + interval} className="relative px-4 py-3 text-left cursor-pointer whitespace-nowrap" style={{
            fontSize: `${labelFontSize}em`,
                          fontWeight: '600',
                          borderBottom: '2px solid rgba(255,255,255,0.2)',
            color: darkMode ? '#fff' : '#222',
            background: parentBg,
            minWidth: 90,
            overflow: 'visible',
            whiteSpace: wrapLabels ? 'normal' : 'nowrap',
            wordBreak: wrapLabels ? 'break-word' : 'normal',
          }} title={interval}
                          onClick={() => handleHeaderClick('json', interval, item.value, interval)}>
                          <div className="flex items-center justify-between">
                            <span>{interval}</span>
                            <span className="ml-1 opacity-60">
                              {sortKey && sortKey.type === 'json' && sortKey.parentKey === item.value && sortKey.interval === interval ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                            </span>
                          </div>
                        </th>
                      ));
                    }
                    return null;
                  })}
                  {/* No extra row for regular or trade columns */}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sortedRows = getSortedRows(filteredLogs);

                  return sortedRows.map((row, idx) => {
                    let json = {};
                    try {
                      if (typeof row.json_data === 'string') {
                        let raw = row.json_data.replace(/\bNaN\b|\bInfinity\b|\b-Infinity\b/g, 'null');
                        json = JSON.parse(raw);
                      } else {
                        json = row.json_data || {};
                      }
                    } catch { json = {}; }
                    const allRows = json?.signal_data?.all_last_rows || {};
                    // Determine unique key for row selection
                    const rowKey = row.Unique_id != null ? row.Unique_id : idx;
                    const isSelected = selectedRow === rowKey;
                    return (
                      <tr key={idx} className="cursor-pointer" style={{
                        fontSize: 'inherit',
                        borderBottom: darkMode ? '1px solid #334155' : '1px solid #e5e7eb',
                        transition: 'all 0.15s ease-in-out',
                        color: darkMode ? '#fff' : '#222',
                        background: isSelected ? '#ffe066' : undefined,
                      }}
                      onClick={() => setSelectedRow(isSelected ? null : rowKey)}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = darkMode ? '#3d4451' : '#f0f9ff';
                          e.currentTarget.style.color = darkMode ? '#fff' : '#222';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '';
                          e.currentTarget.style.color = '';
                        }
                      }}>
                        {workingLabelList.map((item, parentIdx) => {
                          if (item.type === 'regular' && activeRegularLabels.includes(item.value)) {
                            const col = commonColumnOptions.find(opt => opt.value === item.value);
                            if (!col) return null;
                            // Regular columns: only first two get turquoise bg in body
                            const isSticky = parentIdx === 0 || parentIdx === 1;
                            const regularBg = isSelected ? '#ffe066' : (isSticky ? (darkMode ? '#5eead4' : '#e0fcf7') : undefined);
                            const regularColor = isSelected ? '#111' : (isSticky ? '#111' : (darkMode ? '#fff' : '#222'));
                            return (
                              <td key={item.value} className="whitespace-nowrap align-top text-sm select-text" style={{
                                fontSize: 'inherit',
                                color: isSelected ? '#111' : regularColor,
                                background: regularBg,
                                minWidth: 120,
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                position: isSticky ? 'sticky' : undefined,
                                left: isSticky ? (parentIdx === 0 ? 0 : 120) : undefined,
                                zIndex: isSticky ? 30 : undefined,
                                padding: '1px 6px !important', // Even smaller padding
                                lineHeight: '1 !important', // Minimal line height
                                height: '20px !important', // Smaller fixed height
                                verticalAlign: 'middle !important', // Center content vertically
                              }} title={row[item.value] != null ? formatCellValue(row[item.value], item.value) : ''}>
                                {row[item.value] != null ? formatCellValue(row[item.value], item.value) : ''}
                              </td>
                            );
                          }
                          if (item.type === 'json' && Array.isArray(item.intervals)) {
                            const checkedIntervals = item.intervals.filter(({ interval }) => !!activeJsonLabels[item.value]?.[interval]);
                            // Use the same parentBg for all intervals of this parent
                            const parentBg = isSelected ? '#ffe066' : (parentIdx % 2 === 0 ? (darkMode ? '#1e293b' : '#e0e7ef') : (darkMode ? '#334155' : '#f1f5f9'));
                            const parentColor = isSelected ? '#111' : (darkMode ? '#fff' : '#222');
                            return checkedIntervals.map(({ interval }) => {
                              let value = allRows[interval] ? allRows[interval][item.value] : undefined;
                              return (
                                <td key={item.value + '_' + interval} className="whitespace-nowrap align-top text-sm select-text" style={{
                                  fontSize: 'inherit',
                                  color: parentColor,
                                  background: parentBg,
                                  minWidth: 90,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap',
                                  padding: '1px 4px !important', // Even smaller padding for intervals
                                  lineHeight: '1 !important', // Minimal line height
                                  height: '20px !important', // Smaller fixed height
                                  verticalAlign: 'middle !important', // Center content vertically
                                }} title={value !== undefined ? formatCellValue(value, item.value) : ''}>
                                  {value !== undefined ? formatCellValue(value, item.value) : '-'}
                                </td>
                              );
                            });
                          }
                          return null;
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            
            {/* Rows Per Page Control */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              margin: '12px 0 8px 0',
              padding: '8px 12px',
              background: darkMode ? '#1e293b' : '#f1f5f9',
              borderRadius: 6,
              border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            }}>
              <span style={{ 
                fontWeight: 600, 
                color: darkMode ? '#fff' : '#222',
                fontSize: 14 
              }}>
                Rows per page:
              </span>
              <input
                type="number"
                min="10"
                max="5000"
                value={logsPerPage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 10 && value <= 5000) {
                    setLogsPerPage(value);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRowsPerPageChange(logsPerPage);
                  }
                }}
                onBlur={() => handleRowsPerPageChange(logsPerPage)}
                style={{
                  width: 80,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #888',
                  background: darkMode ? '#23272f' : '#fff',
                  color: darkMode ? '#fff' : '#222',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              />
              <span style={{ 
                fontSize: 12, 
                opacity: 0.7, 
                color: darkMode ? '#9ca3af' : '#6b7280' 
              }}>
                (10-5000)
              </span>
          </div>
            
            {/* Bottom Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                margin: '16px 0 8px 0',
                padding: '12px',
                background: darkMode ? '#23272f' : '#f8f9fa',
                borderRadius: 8,
                border: darkMode ? '1px solid #334155' : '1px solid #e5e7eb',
              }}>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #888',
                    fontWeight: 600,
                    fontSize: 14,
                    background: currentPage === 1 ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                    color: currentPage === 1 ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #888',
                    fontWeight: 600,
                    fontSize: 14,
                    background: currentPage === 1 ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                    color: currentPage === 1 ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                
                <span style={{ fontWeight: 600, color: darkMode ? '#fff' : '#222' }}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #888',
                    fontWeight: 600,
                    fontSize: 14,
                    background: currentPage === totalPages ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                    color: currentPage === totalPages ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #888',
                    fontWeight: 600,
                    fontSize: 14,
                    background: currentPage === totalPages ? (darkMode ? '#334155' : '#e5e7eb') : (darkMode ? '#0ea5e9' : '#0d9488'),
                    color: currentPage === totalPages ? (darkMode ? '#6b7280' : '#9ca3af') : '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListViewPage; 