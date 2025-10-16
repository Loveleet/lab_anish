import React from 'react';

const signalLabels = {
  "2POLE_IN5LOOP": "2P_L",
  "IMACD": "IMACD",
  "2POLE_Direct_Signal": "2P_DS",
  "HIGHEST SWING HIGH": "HSH",
  "LOWEST SWING LOW": "LSL",
  "NORMAL SWING HIGH": "NSH",
  "NORMAL SWING LOW": "NSL",
  "ProGap": "PG",
  "CrossOver": "CO",
  "Spike": "SP",
  "Kicker": "Kicker",
};

const PairStatsFilters = ({
  canonicalSignalKeys,
  selectedSignals,
  setSelectedSignals,
  signalRadioMode,
  setSignalRadioMode,
  signalToggleAll,
  setSignalToggleAll,
  allMachines,
  selectedMachines,
  setSelectedMachines,
  machineRadioMode,
  setMachineRadioMode,
  machineToggleAll,
  setMachineToggleAll,
  selectedActions,
  setSelectedActions,
  actionRadioMode,
  setActionRadioMode,
  actionToggleAll,
  setActionToggleAll,
  trades,
  darkMode,
}) => {
  // Action list from trades
  const allActions = Array.from(new Set(trades.map(t => t.Action).filter(Boolean)));

  return (
    <div
      className="w-full flex flex-wrap gap-4 mb-1"
      style={{
        background: darkMode ? '#181a20' : '#fff',
        borderRadius: '1.25rem',
        boxShadow: darkMode
          ? '0 2px 8px 0 rgba(0,0,0,0.22), 0 1.5px 6px 0 rgba(0,0,0,0.13)'
          : '0 2px 8px 0 rgba(0,0,0,0.08), 0 1.5px 6px 0 rgba(0,0,0,0.06)',
        border: darkMode ? '1.5px solid #232526' : '1.5px solid #e5e7eb',
        padding: '1.25rem',
        marginBottom: '0.25rem', // 1 = 0.25rem
      }}
    >
      {/* Signal Filter Group */}
      <div
        className="flex-1 min-w-[260px] break-inside-avoid rounded-2xl shadow-lg p-4 gap-2 w-full"
        style={{
          background: darkMode
            ? 'linear-gradient(to bottom right, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(to bottom right, #e0eafc 0%, #cfdef3 100%)',
          border: darkMode ? '1.5px solid #334155' : '1.5px solid #bcd0ee',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="block text-xl font-extrabold mb-2 tracking-wide relative group transition-transform duration-200 cursor-pointer text-blue-700 dark:text-blue-200 hover:scale-105">
            <span className="mr-2">📡</span> Signal
            <span className="absolute left-0 bottom-0 w-full h-1 rounded bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500 opacity-70 group-hover:opacity-100 group-hover:scale-x-110 transition-all"></span>
          </span>
          <button
            onClick={() => {
              const toggled = !signalRadioMode;
              setSignalRadioMode(toggled);
              if (toggled) {
                const selected = canonicalSignalKeys.find((key) => selectedSignals[key]);
                if (selected) {
                  const updated = {};
                  canonicalSignalKeys.forEach((key) => {
                    updated[key] = key === selected;
                  });
                  setSelectedSignals(updated);
                  localStorage.setItem('pair_stats_selected_signals', JSON.stringify(updated));
                }
              }
            }}
            className="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-300 dark:hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-all"
            title="Toggle between radio and checkbox mode"
          >
            {signalRadioMode ? "🔘 Check" : "☑️ Radio"}
          </button>
          {!signalRadioMode && (
            <button
              onClick={() => {
                const newState = {};
                canonicalSignalKeys.forEach(key => newState[key] = signalToggleAll);
                setSelectedSignals(newState);
                setSignalToggleAll(!signalToggleAll);
                localStorage.setItem('pair_stats_selected_signals', JSON.stringify(newState));
              }}
              className={`text-xs font-semibold px-2 py-1 rounded w-fit ml-2 ${
                signalToggleAll
                  ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 hover:bg-green-300 dark:hover:bg-green-700 focus:ring-2 focus:ring-green-400'
                  : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-700 focus:ring-2 focus:ring-red-400'
              } transition-all`}
              title="Select or uncheck all signals"
            >
              {signalToggleAll ? "✅ All" : "❌ Uncheck"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canonicalSignalKeys.map((signal) => (
            <label key={signal} className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded px-2 py-1 shadow-sm border border-gray-200 dark:border-gray-700">
              {signalRadioMode ? (
                <input
                  type="radio"
                  name="signalFilterRadio"
                  checked={selectedSignals[signal]}
                  onChange={() => {
                    const updated = {};
                    canonicalSignalKeys.forEach((key) => {
                      updated[key] = key === signal;
                    });
                    setSelectedSignals(updated);
                    localStorage.setItem('pair_stats_selected_signals', JSON.stringify(updated));
                  }}
                  className="form-radio h-5 w-5 text-green-600"
                  style={{ accentColor: '#22c55e' }}
                />
              ) : (
                <input
                  type="checkbox"
                  checked={selectedSignals[signal]}
                  onChange={() => {
                    setSelectedSignals(prev => {
                      const updated = { ...prev, [signal]: !prev[signal] };
                      localStorage.setItem('pair_stats_selected_signals', JSON.stringify(updated));
                      return updated;
                    });
                  }}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
              )}
              <span className="text-gray-700 dark:text-gray-200 font-semibold">{signalLabels[signal] || signal}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Machine Filter Group */}
      <div
        className="flex-1 min-w-[220px] break-inside-avoid rounded-2xl shadow-lg p-4 gap-2"
        style={{
          background: darkMode
            ? 'linear-gradient(to bottom right, #14532d 0%, #334155 100%)'
            : 'linear-gradient(to bottom right, #e0ffe0 0%, #e0f7ef 100%)',
          border: darkMode ? '1.5px solid #14532d' : '1.5px solid #bde5d6',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="block text-xl font-extrabold mb-2 tracking-wide relative group transition-transform duration-200 cursor-pointer text-green-700 dark:text-green-200 hover:scale-105">
            <span className="mr-2">🖥️</span> Machine
            <span className="absolute left-0 bottom-0 w-full h-1 rounded bg-gradient-to-r from-green-400 via-green-300 to-green-500 opacity-70 group-hover:opacity-100 group-hover:scale-x-110 transition-all"></span>
          </span>
          <button
            onClick={() => {
              const toggled = !machineRadioMode;
              setMachineRadioMode(toggled);
              if (toggled) {
                const selected = allMachines.find((m) => selectedMachines[m.MachineId]);
                if (selected) {
                  const updated = {};
                  allMachines.forEach((m) => {
                    if (m.Active) updated[m.MachineId] = m.MachineId === selected.MachineId;
                  });
                  setSelectedMachines(updated);
                  localStorage.setItem('pair_stats_selected_machines', JSON.stringify(updated));
                }
              }
            }}
            className="bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 px-2 py-1 rounded text-xs font-semibold hover:bg-green-300 dark:hover:bg-green-700 focus:ring-2 focus:ring-green-400 transition-all"
            title="Toggle between radio and checkbox mode"
          >
            {machineRadioMode ? "🔘 Check" : "☑️ Radio"}
          </button>
          {!machineRadioMode && (
            <button
              onClick={() => {
                const allChecked = Object.values(selectedMachines).every(v => v === true);
                const updated = {};
                allMachines.forEach(machine => {
                  if (machine.Active) updated[machine.MachineId] = !allChecked;
                });
                setSelectedMachines(updated);
                setMachineToggleAll(!machineToggleAll);
                localStorage.setItem('pair_stats_selected_machines', JSON.stringify(updated));
              }}
              className={`text-xs font-semibold px-2 py-1 rounded w-fit ml-2 ${
                Object.values(selectedMachines).every(v => v === false)
                  ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 hover:bg-green-300 dark:hover:bg-green-700 focus:ring-2 focus:ring-green-400'
                  : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-700 focus:ring-2 focus:ring-red-400'
              } transition-all`}
              title="Select or uncheck all machines"
            >
              {Object.values(selectedMachines).every(v => v === false) ? "✅ All" : "❌ Uncheck"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
          {allMachines.length === 0 ? (
            <span className="text-gray-400 text-xs">No machines found</span>
          ) : (
            allMachines.map((machine) => (
              <label key={machine.MachineId} className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded px-2 py-1 shadow-sm border border-gray-200 dark:border-gray-700">
                {machineRadioMode ? (
                  <input
                    type="radio"
                    name="machineFilterRadio"
                    checked={selectedMachines[machine.MachineId] === true}
                    onChange={() => {
                      const updated = {};
                      allMachines.forEach((m) => {
                        if (m.Active) updated[m.MachineId] = m.MachineId === machine.MachineId;
                      });
                      setSelectedMachines(updated);
                      localStorage.setItem('pair_stats_selected_machines', JSON.stringify(updated));
                    }}
                    className="form-radio h-5 w-5 text-green-600"
                    style={{ accentColor: '#22c55e' }}
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={selectedMachines[machine.MachineId] || false}
                    onChange={() => {
                      setSelectedMachines(prev => {
                        const updated = { ...prev, [machine.MachineId]: !prev[machine.MachineId] };
                        localStorage.setItem('pair_stats_selected_machines', JSON.stringify(updated));
                        return updated;
                      });
                    }}
                    className="form-checkbox h-5 w-5 text-green-600"
                  />
                )}
                <span className="text-gray-700 dark:text-gray-200 font-semibold">{machine.MachineId}</span>
              </label>
            ))
          )}
        </div>
      </div>
      {/* Action Filter Group */}
      <div
        className="flex-1 min-w-[180px] break-inside-avoid rounded-2xl shadow-lg p-4 gap-2"
        style={{
          background: darkMode
            ? 'linear-gradient(to bottom right, #831843 0%, #334155 100%)'
            : 'linear-gradient(to bottom right, #ffe0f0 0%, #f3e0ff 100%)',
          border: darkMode ? '1.5px solid #831843' : '1.5px solid #e5bde5',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="block text-xl font-extrabold mb-2 tracking-wide relative group transition-transform duration-200 cursor-pointer text-pink-700 dark:text-pink-200 hover:scale-105">
            <span className="mr-2">🛒</span> Action
            <span className="absolute left-0 bottom-0 w-full h-1 rounded bg-gradient-to-r from-pink-400 via-pink-300 to-pink-500 opacity-70 group-hover:opacity-100 group-hover:scale-x-110 transition-all"></span>
          </span>
          <button
            onClick={() => {
              const toggled = !actionRadioMode;
              setActionRadioMode(toggled);
              if (toggled) {
                const selected = Object.keys(selectedActions).find((key) => selectedActions[key]);
                if (selected) {
                  const updated = {};
                  Object.keys(selectedActions).forEach((key) => {
                    updated[key] = key === selected;
                  });
                  setSelectedActions(updated);
                  localStorage.setItem('pair_stats_selected_actions', JSON.stringify(updated));
                }
              }
            }}
            className="bg-pink-200 dark:bg-pink-800 text-pink-900 dark:text-pink-100 px-2 py-1 rounded text-xs font-semibold hover:bg-pink-300 dark:hover:bg-pink-700 focus:ring-2 focus:ring-pink-400 transition-all"
            title="Toggle between radio and checkbox mode"
          >
            {actionRadioMode ? "🔘 Check" : "☑️ Radio"}
          </button>
          {!actionRadioMode && (
            <button
              onClick={() => {
                const newState = {};
                Object.keys(selectedActions).forEach(key => newState[key] = actionToggleAll);
                setSelectedActions(newState);
                setActionToggleAll(!actionToggleAll);
                localStorage.setItem('pair_stats_selected_actions', JSON.stringify(newState));
              }}
              className={`text-xs font-semibold px-2 py-1 rounded w-fit ml-2 ${
                actionToggleAll
                  ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 hover:bg-green-300 dark:hover:bg-green-700 focus:ring-2 focus:ring-green-400'
                  : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-700 focus:ring-2 focus:ring-red-400'
              } transition-all`}
              title="Select or uncheck all actions"
            >
              {actionToggleAll ? "✅ All" : "❌ Uncheck"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allActions.map((action) => (
            <label key={action} className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded px-2 py-1 shadow-sm border border-gray-200 dark:border-gray-700">
              {actionRadioMode ? (
                <input
                  type="radio"
                  name="actionFilterRadio"
                  checked={selectedActions[action]}
                  onChange={() => {
                    const updated = {};
                    allActions.forEach((key) => {
                      updated[key] = key === action;
                    });
                    setSelectedActions(updated);
                    localStorage.setItem('pair_stats_selected_actions', JSON.stringify(updated));
                  }}
                  className="form-radio h-5 w-5 text-pink-600"
                  style={{ accentColor: '#ec4899' }}
                />
              ) : (
                <input
                  type="checkbox"
                  checked={selectedActions[action]}
                  onChange={() => {
                    setSelectedActions(prev => {
                      const updated = { ...prev, [action]: !prev[action] };
                      localStorage.setItem('pair_stats_selected_actions', JSON.stringify(updated));
                      return updated;
                    });
                  }}
                  className="form-checkbox h-5 w-5 text-pink-600"
                />
              )}
              <span className="text-gray-700 dark:text-gray-200 font-semibold">{action}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PairStatsFilters; 