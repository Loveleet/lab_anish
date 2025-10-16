import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import TradeFilterPanel from "./components/TradeFilterPanel";
import DashboardCard from './components/DashboardCard';  // adjust path if needed
import TableView from "./components/TableView";
import Sidebar from "./components/Sidebar";
import ChartGrid from "./components/ChartGrid";
import { Routes, Route } from "react-router-dom";
import ChartGridPage from "./components/ChartGridPage";
import CustomChartGrid from "./components/CustomChartGrid";
import PairStatsGrid from "./components/PairStatsGrid";
// import SettingsPage from './components/SettingsPage';
import ReportDashboard from './components/ReportDashboard';
import ListViewPage from './components/ListViewPage';
import LiveTradeViewPage from './components/LiveTradeViewPage';
import GroupViewPage from './pages/GroupViewPage';

// Animated SVG background for LAB title
function AnimatedGraphBackground({ width = 400, height = 80, opacity = 0.4 }) {
  // Two lines: green and red
  const [points1, setPoints1] = useState([]);
  const [points2, setPoints2] = useState([]);
  const tRef = useRef(0);

  // Generate base points
  const basePoints = [0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400];

  useEffect(() => {
    let frame;
    function animate() {
      tRef.current += 0.008; // Slow animation
      // Animate two lines with sine/cosine and some phase offset
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
      <polyline
        points={points1.join(' ')}
        stroke="green"
        strokeWidth="4"
        fill="none"
        strokeLinejoin="round"
      />
      <polyline
        points={points2.join(' ')}
        stroke="red"
        strokeWidth="4"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Helper to display intervals in label
const displayInterval = (interval) =>
  interval === "60"
    ? "1h"
    : interval === "240"
    ? "4h"
    : interval === "D"
    ? "1d"
    : `${interval}m`;

const App = () => {
  const [metrics, setMetrics] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [tradeData, setTradeData] = useState([]);
  const [clientData, setClientData] = useState([]);
  const [logData, setLogData] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const [signalRadioMode, setSignalRadioMode] = useState(false);
  const [machineRadioMode, setMachineRadioMode] = useState(false);
  const [includeMinClose, setIncludeMinClose] = useState(true);
  const [activeSubReport, setActiveSubReport] = useState("running");
  const [fontSizeLevel, setFontSizeLevel] = useState(() => {
    const saved = localStorage.getItem("fontSizeLevel");
    return saved ? parseInt(saved, 10) : 3; // default level 3
  });
  // Chart settings state
  const [chartSettings, setChartSettings] = useState(() => {
    // Try to load from localStorage for persistence if desired
    const saved = localStorage.getItem("chartSettings");
    return saved
      ? JSON.parse(saved)
      : {
          layout: 3,
          showRSI: true,
          showVolume: true,
        };
  });
  // Persist chartSettings to localStorage on change
  useEffect(() => {
    localStorage.setItem("chartSettings", JSON.stringify(chartSettings));
  }, [chartSettings]);

  // Responsive font scaling: update --app-font-scale on fontSizeLevel change
  useEffect(() => {
    const root = document.documentElement;
    const baseSize = 1; // default rem (1x)
    const adjustment = (fontSizeLevel - 8) * 0.25; // increase/decrease per level
    root.style.setProperty("--app-font-scale", `${baseSize + adjustment}`);
  }, [fontSizeLevel]);

  useEffect(() => {
    localStorage.setItem("fontSizeLevel", fontSizeLevel);
  }, [fontSizeLevel]);

  const [layoutOption, setLayoutOption] = useState(() => {
    const saved = localStorage.getItem("layoutOption");
    return saved ? parseInt(saved, 10) : 3;
  }); // default 3 cards per row
  const [signalToggleAll, setSignalToggleAll] = useState(() => {
    const saved = localStorage.getItem("selectedSignals");
    if (saved) {
      const parsed = JSON.parse(saved);
      const allSelected = Object.values(parsed).every((val) => val === true);
      return allSelected ? false : true; // If all selected, button should show ❌ Uncheck
    }
    return true; // Default
  });
  const [machineToggleAll, setMachineToggleAll] = useState(true);
  
  // ChartGrid state
  const [showChartGrid, setShowChartGrid] = useState(false);
  const [chartGridSymbols, setChartGridSymbols] = useState(['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT']);
  
const [fromDate, setFromDate] = useState(() => {
  const saved = localStorage.getItem("fromDate");
  return saved ? moment(saved) : null;
});

const [toDate, setToDate] = useState(() => {
  const saved = localStorage.getItem("toDate");
  return saved ? moment(saved) : null;
});

useEffect(() => {
  if (fromDate) {
    localStorage.setItem("fromDate", fromDate.toISOString());
  }
}, [fromDate]);

useEffect(() => {
  if (toDate) {
    localStorage.setItem("toDate", toDate.toISOString());
  }
}, [toDate]);

  const [selectedSignals, setSelectedSignals] = useState({
    "2POLE_IN5LOOP": true,
    "IMACD": true,
    "2POLE_Direct_Signal": true,
    "HIGHEST SWING HIGH": true,
    "LOWEST SWING LOW": true,
    "NORMAL SWING HIGH": true,
    "NORMAL SWING LOW": true,
    "ProGap": true,
    "CrossOver": true,
    "Spike": true,
    "Kicker": true,

  });
  const [intervalRadioMode, setIntervalRadioMode] = useState(false);
  const [actionRadioMode, setActionRadioMode] = useState(false);

const [selectedActions, setSelectedActions] = useState({
  BUY: true,
  SELL: true,
});

// Sync selectedActions when actionRadioMode changes (radio-mode behavior)
useEffect(() => {
  if (actionRadioMode) {
    const selected = Object.keys(selectedActions).find((key) => selectedActions[key]);
    if (selected) {
      const updated = { BUY: false, SELL: false };
      updated[selected] = true;
      setSelectedActions(updated);
      localStorage.setItem("selectedActions", JSON.stringify(updated));
    }
  }
}, [actionRadioMode]);
const [selectedIntervals, setSelectedIntervals] = useState(() => {
  const saved = localStorage.getItem("selectedIntervals");
  return saved
    ? JSON.parse(saved)
    : { "1m": true, "3m": true, "5m": true, "15m": true, "30m": true, "1h": true, "2h": true, "4h": true };
});
  const [selectedMachines, setSelectedMachines] = useState({});
  const [dateKey, setDateKey] = useState(0);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const tradeRes = await fetch("https://lab-code-1.onrender.com/api/trades");
        const tradeJson = tradeRes.ok ? await tradeRes.json() : { trades: [] };
        const trades = Array.isArray(tradeJson.trades) ? tradeJson.trades : [];
        // console.log('[App.jsx] Fetched trades from API:', trades);

        const machinesRes = await fetch("https://lab-code-1.onrender.com/api/machines");
        const machinesJson = machinesRes.ok ? await machinesRes.json() : { machines: [] };
        const machinesList = Array.isArray(machinesJson.machines) ? machinesJson.machines : [];

        const logRes = await fetch("/logs.json");
        const logJson = logRes.ok ? await logRes.json() : { logs: [] };
        const logs = Array.isArray(logJson.logs) ? logJson.logs : [];

        setMachines(machinesList);
        setTradeData(trades);
        setLogData(logs);

        setClientData(machinesList);

        if (Object.keys(selectedMachines).length === 0) {
          const savedMachines = localStorage.getItem("selectedMachines");
          if (savedMachines) {
            setSelectedMachines(JSON.parse(savedMachines)); // ✅ Load from storage first
          } else {
            const activeMachines = machinesList.reduce((acc, machine) => {
              if (machine.Active) acc[machine.MachineId] = true;
              return acc;
            }, {});
            setSelectedMachines(activeMachines);
            localStorage.setItem("selectedMachines", JSON.stringify(activeMachines)); // ✅ Save to prevent resets
          }
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setTradeData([]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 20000); // ✅ Fetch every 20 seconds
    return () => clearInterval(interval);
  }, []);
const filteredTradeData = useMemo(() => {
  if (!Array.isArray(tradeData)) return [];
 
  return tradeData.filter(trade => {

    if (!includeMinClose && trade.Min_close === "Min_close") return false;
    const isSignalSelected = selectedSignals[trade.SignalFrom];
    const isMachineSelected = selectedMachines[trade.MachineId];
    const isIntervalSelected = selectedIntervals[trade.Interval];
    const isActionSelected = selectedActions[trade.Action];

    // ✅ Handle missing or malformed Candle time
    if (!trade.Candel_time) return false;

    const tradeTime = moment(trade.Candel_time); // ⏳ Parse to moment

    // ✅ Check if within selected date & time range
    const isDateInRange = (!fromDate || tradeTime.isSameOrAfter(fromDate)) &&
                          (!toDate || tradeTime.isSameOrBefore(toDate));

    return isSignalSelected && isMachineSelected && isIntervalSelected && isActionSelected && isDateInRange;
  });
  // console.log('[App.jsx] filteredTradeData:', filteredTradeData);
}, [tradeData, selectedSignals, selectedMachines, selectedIntervals, selectedActions, fromDate, toDate, includeMinClose, fontSizeLevel]);

const getFilteredForTitle = useMemo(() => {
  const memo = {};

  (filteredTradeData || []).forEach((trade) => {
    const pushTo = (key) => {
      if (!memo[key]) memo[key] = [];
      memo[key].push(trade);  // ✅ Only push raw trade here
    };

    pushTo("Total_Trades");

    if (trade.Type === "close") pushTo("Profit_+_Loss_=_Closed_Profit $");
    if (trade.Type === "running") pushTo("Profit_+_Loss_=_Running_Profit $");
    if (["assign", "running", "close"].includes(trade.Type)) pushTo("Assign_/_Running_/_Closed Count");

    if (trade.Action === "BUY" && trade.Type === "running") {
      pushTo("Running_/_Total_Buy");
    }

    if (trade.Action === "SELL" && trade.Type === "running") {
      pushTo("Running_/_Total_Sell");
    }

    if (trade.Commision_journey && trade.Pl_after_comm > 0 && trade.Profit_journey === false && trade.Type === "running" ) pushTo("Comission_Point_Crossed");
    if (trade.Profit_journey && trade.Pl_after_comm > 0 && trade.Type === "running"  ) pushTo("Profit_Journey_Crossed");
    if (trade.Pl_after_comm < 0 && trade.Type === "running" ) pushTo("Below_Commision_Point");

    if (trade.Type === "close" && trade.Commision_journey && !trade.Profit_journey) pushTo("Closed_After_Comission_Point");
    if (trade.Type === "close" && trade.Pl_after_comm < 0) pushTo("Close_in_Loss");
    if (trade.Hedge) pushTo("Total_Hedge");
    if (trade.Hedge && trade.Type === "running") pushTo("Hedge_Running_pl");
    if (trade.Hedge && trade.Type === "close") pushTo("Hedge_Closed_pl");

    if (trade.Type === "close" && trade.Pl_after_comm > 0) pushTo("Close_in_Profit");
    if (trade.Type === "close" && trade.Profit_journey) pushTo("Close_After_Profit_Journey");
    if (trade.Type === "close" && trade.Commision_journey && trade.Pl_after_comm < 0) pushTo("Close_Curve_in_Loss");

    if (trade.Type === "close" && trade.Min_close === "Min_close") {
      if (trade.Pl_after_comm > 0) pushTo("Min_Close_Profit");
      if (trade.Pl_after_comm < 0) pushTo("Min_Close_Loss");
    }

    pushTo("Total_Closed_Stats");
    pushTo("Direct_Closed_Stats");
    pushTo("Hedge_Closed_Stats");
    pushTo("Total_Running_Stats");
    pushTo("Direct_Running_Stats");
    pushTo("Hedge_Running_Stats");
    pushTo("Hedge_on_Hold");
    pushTo("Total_Stats");
    pushTo("Closed_Count_Stats");
    pushTo("Assigned_New");
    



    if (trade.Hedge === true) pushTo("Hedge_Stats");

    // --- ADD: Buy_Sell_Stats logic
    if (["BUY", "SELL"].includes(trade.Action)) pushTo("Buy_Sell_Stats");

    // --- ADD: Journey_Stats logic (fix missing)
    if (trade.Type === "running" && trade.Pl_after_comm > 0 && trade.Profit_journey === true) pushTo("Journey_Stats_Running");
    if (trade.Type === "running" && trade.Pl_after_comm > 0 && trade.Commision_journey === true && !trade.Profit_journey) pushTo("Journey_Stats_Running");
    if (trade.Type === "running" && trade.Pl_after_comm < 0) pushTo("Journey_Stats_Running");
  });

  return memo;
}, [filteredTradeData]);

useEffect(() => {
  // 🔹 Total Investment Calculation
  const totalInvestment = filteredTradeData.reduce((sum, trade) => sum + (trade.Investment || 0), 0);
  let investmentAvailable = 50000 - totalInvestment;
  investmentAvailable = investmentAvailable < 0 ? 0 : investmentAvailable; // ✅ Prevent negative values

  const closePlus = filteredTradeData
    .filter(trade => trade.Pl_after_comm > 0 && trade.Type === "close" ) // ✅ Correct field reference
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const closeMinus = filteredTradeData
    .filter(trade => trade.Pl_after_comm < 0 && trade.Type === "close"  ) // ✅ Correct field reference
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const runningPlus = filteredTradeData
    .filter(trade => trade.Pl_after_comm > 0 && trade.Type === "running" && trade.Hedge === false) // ✅ Correct field reference
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const runningMinus = filteredTradeData
    .filter(trade => trade.Pl_after_comm < 0 && trade.Type === "running" && trade.Hedge === false) // ✅ Correct field reference
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const closedProfit = filteredTradeData
      .filter(trade => trade.Type === "close")
      .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const runningProfit = filteredTradeData
  .filter(trade => trade.Hedge === false && trade.Type === "running")
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);

  const buyRunningDirect = filteredTradeData.filter(t => t.Action === "BUY" && t.Type === "running" && t.Hedge === false).length;
  const buyRunningHedge = filteredTradeData.filter(t => t.Action === "BUY" && t.Type === "running" && t.Hedge === true).length;
  const buyRunningCloseD = filteredTradeData.filter(t => t.Action === "BUY" && t.Type === "close").length ;
  const buyRunningCloseH = filteredTradeData.filter(t => t.Action === "BUY" && t.Type === "hedge_close").length ;
  const buyRunningClose = buyRunningCloseD + buyRunningCloseH;


  const buyTotal = filteredTradeData.filter(t => t.Action === "BUY").length;
  const sellRunningDirect = filteredTradeData.filter(t => t.Action === "SELL" && t.Type === "running" && t.Hedge === false).length;
  const sellRunningHedge = filteredTradeData.filter(t => t.Action === "SELL" && t.Type === "running" && t.Hedge === true).length;
  const sellRunningCloseD = filteredTradeData.filter(t => t.Action === "SELL" && t.Type === "close" ).length;
  const sellRunningCloseH = filteredTradeData.filter(t => t.Action === "SELL" && t.Type === "hedge_close").length;
  const sellRunningClose = sellRunningCloseD + sellRunningCloseH;





  const sellTotal = filteredTradeData.filter(t => t.Action === "SELL").length;

  const hedgePlusRunning = filteredTradeData
  .filter(trade => trade.Pl_after_comm > 0 && trade.Hedge === true && trade.Hedge_1_1_bool === true) // ✅ Correct field reference
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const hedgeMinusRunning = filteredTradeData
    .filter(trade => trade.Pl_after_comm < 0 && trade.Hedge === true && trade.Hedge_1_1_bool === true)
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);   
  const hedgeRunningProfit = filteredTradeData
      .filter(trade => trade.Type === "running" && trade.Hedge === true && trade.Hedge_1_1_bool === true)
      .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);

  const hedgeActiveRunningPlus = filteredTradeData
  .filter(trade => trade.Hedge === true && trade.Hedge_1_1_bool === false && trade.Pl_after_comm > 0 && trade.Type === "running")
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const hedgeActiveRunningMinus = filteredTradeData 
  .filter(trade => trade.Hedge === true && trade.Hedge_1_1_bool === false && trade.Pl_after_comm < 0 && trade.Type === "running")
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const hedgeActiveRunningTotal = filteredTradeData
  .filter(trade => trade.Hedge === true && trade.Hedge_1_1_bool === false && trade.Type === "running")
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);

  const hedgeClosedPlus = filteredTradeData
  .filter(trade => trade.Type === "hedge_close" && trade.Pl_after_comm > 0)
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const hedgeClosedMinus = filteredTradeData
  .filter(trade => trade.Type === "hedge_close" && trade.Pl_after_comm < 0)
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  const hedgeClosedTotal = filteredTradeData
  .filter(trade => trade.Type === "hedge_close"  )
  .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0);
  
  const minCloseProfitVlaue = filteredTradeData
    .filter(trade => trade.Min_close === "Min_close"  &&  trade.Type === "close" && trade.Pl_after_comm > 0)
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0).toFixed(2)
  
  const minCloseLossVlaue = filteredTradeData
    .filter(trade => trade.Min_close === "Min_close"  &&  trade.Type === "close" && trade.Pl_after_comm < 0)
    .reduce((sum, trade) => sum + (trade.Pl_after_comm || 0), 0).toFixed(2)

   // console.log("🔍 Filtered Trade Data:", filteredTradeData);  


  // 🔹 Format dates for comparison
  // const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // const yesterdayDate = yesterday.toISOString().split("T")[0];

  setMetrics(prevMetrics => ({
    ...prevMetrics,
Total_Closed_Stats: (
          <>
{/* className={`relative px-[3px] text-yellow-300 font-semibold font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }} */}

              <span title="Closed Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>Total Closed Trades &nbsp;</span>
              <span title="Closed Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
             
             &nbsp;
               <span title="Closed Count" className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {filteredTradeData.filter(trade => trade.Type === "close" || trade.Type === "hedge_close").length}
              </span>
             
              <div style={{ height: '14px' }} />
              <span title="Closed Profit (Hedge + Direct) " className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(closePlus + hedgeClosedPlus).toFixed(2)}
              </span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span title="Closed Loss (Hedge + Direct)" className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(closeMinus  +  hedgeClosedMinus).toFixed(2)}
              </span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span
                className={`${closedProfit >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Closed Total (Hedge + Direct)"
              >
                {((closePlus + hedgeClosedPlus)+(closeMinus + hedgeClosedMinus)).toFixed(2)}
              </span>
              </>),
Direct_Closed_Stats: (
          <>

               <span title="Closed Count (Only Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>Direct Closed Trades&nbsp;</span>
              <span title="Closed Count (Only Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
                &nbsp;
             
              <span title="Closed Count" className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {filteredTradeData.filter(trade => trade.Type === "close" ).length}
              </span>
             
              <div style={{ height: '14px' }} />

              <span title="Closed Profit (Only Direct) " className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(closePlus).toFixed(2)}
              </span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span title="Closed Loss (Only Direct)" className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(closeMinus).toFixed(2)}
              </span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span
                className={`${(closePlus + closeMinus ) >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Closed Total (Only Direct)"
              >
                {(closePlus + closeMinus ).toFixed(2)}
              </span>
              </>),
Hedge_Closed_Stats: (
            <>

               <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold font-semibold`} style={{ fontSize: `${26 + (fontSizeLevel - 8) * 5}px` }}>Hedge Closed  &nbsp;</span>
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
            &nbsp;
             
              <span
                className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Closed Hedge Count"
              >
                {filteredTradeData.filter(trade => trade.Hedge === true & trade.Type === "hedge_close").length}
              </span>
             
              <div style={{ height: '14px' }} />
              <span className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Closed Hedge Profit +">{hedgeClosedPlus.toFixed(2)}</span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Closed Hedge Profit -">{hedgeClosedMinus.toFixed(2)}</span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span className={`${hedgeClosedTotal >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Closed Hedge Profit Total">{hedgeClosedTotal.toFixed(2)}</span>
            </>
          ),
Total_Running_Stats: (
          <>


             <span title="Running Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>Total Running Trades&nbsp;</span>
             <span title="Running Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇</span>
             &nbsp;
           
            <span title="Running Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {filteredTradeData.filter(trade => trade.Type === "running" & trade.Hedge_1_1_bool === false).length}
              </span>
              
           
           <div style={{ height: '14px' }} />
              &nbsp;
              <span title="Running Profit (Hedge + Direct)" className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(runningPlus+hedgeActiveRunningPlus).toFixed(2)}
              </span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span title="Running Loss (Hedge + Direct)" className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(runningMinus + hedgeActiveRunningMinus).toFixed(2)}
              </span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span
                className={`${(runningProfit + hedgeActiveRunningTotal) >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`}style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Running Total (Hedge + Direct)"
              >
                {((runningProfit + hedgeActiveRunningTotal)).toFixed(2)}
              </span>
               </>),
 Direct_Running_Stats: (
          <>
            
            
             <span title="Running Count (only Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>Direct Running Trades&nbsp;</span>
             <span title="Running Count (only Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇</span>
            &nbsp;
            <span title="Running Count (only Direct)" className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {filteredTradeData.filter(trade => trade.Type === "running" & trade.Hedge === false).length}
              </span>
              
           <div style={{ height: '14px' }} />
              &nbsp;
              <span title="Running Profit (only Direct)" className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {runningPlus.toFixed(2)}
              </span>
              &nbsp;<span style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span title="Running Loss (only Direct)" className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {runningMinus.toFixed(2)}
              </span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span
                className={`${runningProfit >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`}style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Running Total (only Direct)"
              >
                {runningProfit.toFixed(2)}
              </span>
               </>),
 Hedge_Running_Stats: (
            <>

              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${26 + (fontSizeLevel - 8) * 5}px` }}>Hedge Running&nbsp;</span>
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
              &nbsp;
              
              <span
                className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Running Hedge Count"
              >
                {filteredTradeData.filter(trade => trade.Hedge_1_1_bool === false & trade.Hedge === true & trade.Type === "running").length}
              </span>

              <div style={{ height: '14px' }} />
              <span className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Running Hedge in Profit">{hedgeActiveRunningPlus.toFixed(2)}</span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Running Hedge in Loss ">{hedgeActiveRunningMinus.toFixed(2)}</span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span className={`${hedgeActiveRunningTotal >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Running Hedge Total">{hedgeActiveRunningTotal.toFixed(2)}</span>
              </>
          ),


Total_Stats: (
          <>
               

              
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>All Total Trades&nbsp;</span>
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
             &nbsp;
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {filteredTradeData.length}
              </span>
              <div style={{ height: '14px' }} />
              <span title="Total Profit (Hedge + Direct) " className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(runningPlus + hedgeActiveRunningPlus + hedgePlusRunning + hedgeClosedPlus + closePlus ).toFixed(2)}
              </span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span title="Total Loss (Hedge + Direct)" className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>
                {(runningMinus + hedgeClosedMinus + hedgeMinusRunning + closeMinus + hedgeActiveRunningMinus).toFixed(2)}
              </span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span
                className={`${((runningPlus + hedgeActiveRunningPlus + hedgeClosedPlus + hedgePlusRunning + closePlus )+((runningMinus + hedgeClosedMinus + hedgeMinusRunning + closeMinus + hedgeActiveRunningMinus))).toFixed(2) >= 0 ? "text-green-300" : "text-red-400"} text-[35px]`}style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Total (Hedge + Direct)"
              >
                {((runningPlus + hedgeActiveRunningPlus + hedgeClosedPlus + hedgePlusRunning + closePlus )+((runningMinus + hedgeClosedMinus + hedgeMinusRunning + closeMinus + hedgeActiveRunningMinus))).toFixed(2)}
              </span>
            </>
          ),
 Buy_Sell_Stats: (
            <>
              <div style={{ height: '6px' }} />

              <span className={`relative px-[3px] text-yellow-300 font-semibold`} style={{ fontSize: `${28 + (fontSizeLevel - 8) * 5}px` }}>Buy</span>
              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80`} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}> Direct-</span>
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{buyRunningDirect}</span>
              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80`} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>, Hedge-</span>
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{buyRunningHedge}</span>
                <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80`} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>, Close-</span>
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{buyRunningClose}</span>
              &nbsp;&nbsp;<span style={{ fontSize: `${20 + (fontSizeLevel - 8) * 5}px` }}>out of</span>&nbsp;
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{buyTotal}</span>
              <div style={{ height: '10px' }} />
              <span className={`relative px-[3px] text-yellow-300 font-semibold`} style={{ fontSize: `${28 + (fontSizeLevel - 8) * 5}px` }}>Sell</span>
              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80 `} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}> Direct-</span>
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{sellRunningDirect}</span>
              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80 `} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>, Hedge-</span>
               <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{sellRunningHedge}</span>
                <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80`} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>, Close-</span>
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{sellRunningClose}</span>
              &nbsp;&nbsp;<span style={{ fontSize: `${20 + (fontSizeLevel - 8) * 5}px` }}>out of</span>&nbsp;
              <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{sellTotal}</span>
              <br />
            </>
          ),
  Hedge_on_Hold: (
            <>

              
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-200 font-semibold  font-semibold`} style={{ fontSize: `${26 + (fontSizeLevel - 8) * 5}px` }}>Hedge on hold  1-1 &nbsp;</span>
              <span title="Total Trades Count (Hedge + Direct)" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
              &nbsp;
              <span
                className={`relative px-[3px] text-yellow-300 font-semibold  font-semibold`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}
                title="Hedge 1-1 Count"
              >
                {filteredTradeData.filter(trade => trade.Hedge === true & trade.Hedge_1_1_bool === true).length}
              </span>
              <div style={{ height: '14px' }} />
              <span className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Hedge 1-1 Profit">{hedgePlusRunning.toFixed(2)}</span>
              &nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>+ </span>&nbsp;
              <span className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} title="Hedge 1-1 Loss">{hedgeMinusRunning.toFixed(2)}</span>
              &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=</span>&nbsp;&nbsp;
              <span className={`${hedgeRunningProfit >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}title="Hedge 1-1 Total">{hedgeRunningProfit.toFixed(2)}</span>
              </>
          ),

// Closed_Count_Stats: (
//             <>
//             <span title="Closed Trades Count" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>Closed Trades Count&nbsp;</span>
//               <span title="Closed Trade Count" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
//                             <div style={{ height: '14px' }} />

//               <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80 font-semibold`} style={{ fontSize: `${19 + (fontSizeLevel - 8) * 5}px` }}>After&nbsp;&nbsp;&nbsp;PJ -&nbsp;</span><span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }} >{filteredTradeData.filter(trade => trade.Profit_journey === true && trade.Type === "close").length}</span>
           
//               <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80 font-semibold`} style={{ fontSize: `${19 + (fontSizeLevel - 8) * 5}px` }}>, &nbsp;&nbsp;&nbsp;Profit -</span> <span className={`relative px-[3px] text-green-300 `} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Pl_after_comm > 0 && trade.Type === "close").length}</span>

//               <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80 font-semibold`} style={{ fontSize: `${19 + (fontSizeLevel - 8) * 5}px` }}>,&nbsp;&nbsp;&nbsp; Loss -</span> <span className="text-[30px] text-red-400" style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Pl_after_comm < 0 && trade.Type === "close").length}</span>
              
//             </>
//           ),

// Journey_Stats_Running: (
//             <>
//             <span title="Journey Detail" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>Journey Stats&nbsp;</span>
//               <span title="Journey Detail" className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}>👇&nbsp;</span>
//                             <div style={{ height: '14px' }} />

//               <span className="text-[20px] font-semibold opacity-70 text-center" style={{ fontSize: `${20 + (fontSizeLevel - 8) * 5}px` }}>PJ -&nbsp;</span>
//               <span className={`text-green-300 text-[30px]text-center`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Profit_journey === true && trade.Pl_after_comm > 0 && trade.Type === "running").length}</span>
//               <span className="text-[20px] font-semibold opacity-70 text-center" style={{ fontSize: `${20 + (fontSizeLevel - 8) * 5}px` }}>  &nbsp;&nbsp;&nbsp;CJ -&nbsp;</span>
//               <span className="text-yellow-300 text-[30px] text-center" style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Commision_journey === true && trade.Pl_after_comm > 0 && trade.Type === "running" && trade.Profit_journey === false).length}</span>
//               <span className="text-[20px] font-semibold opacity-70 text-center"  style={{ fontSize: `${20 + (fontSizeLevel - 8) * 5}px` }}> &nbsp;&nbsp;BC- &nbsp;</span>
//               <span className={`text-red-400 text-[30px] text-center`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Pl_after_comm < 0 && trade.Type === "running").length}</span>
//             </>
//           ),
// Client_Stats: (
//             <>
//              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-80 font-semibold`} style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}> Clients&nbsp;&nbsp; : &nbsp;&nbsp;</span>
//               <span className="text-[30px]" style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{machines.filter(machine => machine.Active).length}</span>
//               &nbsp;<span className="text-[30px]"  style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}> &nbsp; out of </span>&nbsp;
//               <span className="text-[30px]" style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{machines.length}</span>
//             </>
//           ),
// Min_Close_Profit: (
//             <>
//              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}> Min Close Profit&nbsp;&nbsp;:&nbsp;&nbsp;</span>
//               <span className={`text-green-300 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Min_close === "Min_close" && trade.Type === "close" && trade.Pl_after_comm > 0).length}</span>
//               &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=&nbsp;&nbsp;$&nbsp;&nbsp;</span>
//               <span className={`${minCloseProfitVlaue >= 0 ? "text-green-300" : "text-red-400"} text-[35px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{minCloseProfitVlaue}</span>
//             </>
//           ),
// Min_Close_Loss: (
//             <>
//              <span className={`relative px-[3px] text-yellow-300 font-semibold opacity-70 font-semibold`} style={{ fontSize: `${24 + (fontSizeLevel - 8) * 5}px` }}> Min Close Loss&nbsp;&nbsp;:&nbsp;&nbsp;</span>
//               <span className={`text-red-400 text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{filteredTradeData.filter(trade => trade.Min_close === "Min_close" && trade.Type === "close" && trade.Pl_after_comm < 0).length}</span>
//               &nbsp;&nbsp;<span style={{ fontSize: `${25 + (fontSizeLevel - 8) * 5}px` }}>=&nbsp;&nbsp;$&nbsp;&nbsp;</span>
//               <span className={`${minCloseLossVlaue >= 0 ? "text-green-300" : "text-red-400"} text-[30px]`} style={{ fontSize: `${30 + (fontSizeLevel - 8) * 5}px` }}>{minCloseLossVlaue}</span>
//             </>
//           ),
  }));
// Update dependency array to refresh on filteredTradeData, selectedBox, fontSizeLevel
}, [filteredTradeData, selectedBox, fontSizeLevel]);

useEffect(() => {
  const savedSignals = localStorage.getItem("selectedSignals");
  const savedMachines = localStorage.getItem("selectedMachines");

  if (savedSignals) {
    const parsed = JSON.parse(savedSignals);
    const merged = {
      "2POLE_IN5LOOP": true,
      "IMACD": true,
      "2POLE_Direct_Signal": true,
      "HIGHEST SWING HIGH": true,
      "LOWEST SWING LOW": true,
      "NORMAL SWING HIGH": true,
      "NORMAL SWING LOW": true,
      "ProGap": true,
      "CrossOver": true,
      "Spike": true,
      "Kicker": true,
      ...parsed,
    };
    setSelectedSignals(merged);
    const allSelected = Object.values(merged).every((val) => val === true);
    setSignalToggleAll(!allSelected); // ✅ sync toggle button state
  }

  if (savedMachines) {
    setSelectedMachines(JSON.parse(savedMachines));
  }
}, []);
// Optimized toggle handlers
const toggleMachine = useCallback((machineId) => {
  setSelectedMachines(prev => {
    const updated = { ...prev, [machineId]: !prev[machineId] };
    localStorage.setItem("selectedMachines", JSON.stringify(updated));
    return updated;
  });
}, []);




useEffect(() => {
  if (signalRadioMode) {
    const selected = Object.keys(selectedSignals).find((key) => selectedSignals[key]);
    if (selected) {
      const updated = {};
      Object.keys(selectedSignals).forEach((key) => {
        updated[key] = key === selected;
      });
      setSelectedSignals(updated);
      localStorage.setItem("selectedSignals", JSON.stringify(updated));
    }
  }
}, [signalRadioMode]);   

useEffect(() => {
  if (intervalRadioMode) {
    const selected = Object.keys(selectedIntervals).find(key => selectedIntervals[key]);
    if (selected) {
      const updated = {};
      Object.keys(selectedIntervals).forEach((key) => {
        updated[key] = key === selected;
      });
      setSelectedIntervals(updated);
      localStorage.setItem("selectedIntervals", JSON.stringify(updated));
    }
  }
}, [intervalRadioMode]);                         

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    // Default: match system
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Sync dark mode with localStorage changes (e.g., from reports or another tab)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'theme') {
        setDarkMode(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const fetchTrades = async () => {
      const res = await fetch('https://lab-code-1.onrender.com/api/trades');
      const data = await res.json();
      setTrades(data.trades || []);
    };
    fetchTrades();
  }, []);

  return (
      <Routes>
        <Route path="/chart-grid" element={<ChartGridPage />} />
        <Route path="/custom-chart-grid" element={<CustomChartGrid trades={filteredTradeData} />} />
        <Route path="/reports" element={<ReportDashboard />} />
        <Route path="/reports/list" element={<ListViewPage />} />
        <Route path="/live-trade-view" element={<LiveTradeViewPage />} />
        <Route path="/pages/group-view" element={<GroupViewPage />} />
        {/* <Route path="/settings" element={<SettingsPage />} /> */}
        <Route path="/*" element={
          <>
            {/* Sticky LAB section at the very top of the app, outside the main flex container */}
            <div className="sticky top-0 z-40 flex justify-center items-center border-b border-gray-200 dark:border-gray-700 shadow-sm bg-[#f5f6fa] dark:bg-black" style={{ minHeight: '80px', height: '80px', padding: '0 16px' }}>
              {/* Light/Dark mode toggle button */}
              <button
                onClick={() => setDarkMode(dm => !dm)}
                className="absolute right-8 top-3 z-20 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow hover:scale-110 transition-all"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                style={{ fontSize: 24 }}
              >
                {darkMode ? '🌞' : '🌙'}
              </button>
              {/* SVG Graph Background (animated) */}
              <AnimatedGraphBackground width={400} height={48} opacity={0.4} />
              {/* LAB text */}
              <h1
                className="relative z-10 text-5xl font-extrabold text-center bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight animate-pulse"
                style={{
                  WebkitTextStroke: '1px #222',
                  textShadow: '0 4px 24px rgba(0,0,0,0.18)',
                }}
              >
                LAB
                <span className="block w-16 h-1 mx-auto mt-2 rounded-full bg-gradient-to-r from-blue-400 via-pink-400 to-yellow-300 animate-gradient-x"></span>
              </h1>
            </div>
            <div className="flex">
              {/* Sidebar */}
              <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
              <div className={`flex-1 min-h-screen transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"} overflow-hidden relative bg-[#f5f6fa] dark:bg-black`}>
                {/* Main content area, no extra margin-top */}
                <div className="p-8 pt-2 overflow-x-auto">
                  <h2 className="text-2xl font-semibold text-white mb-0">Trade Filter (MODULAR)</h2>
                  <TradeFilterPanel
                    selectedSignals={selectedSignals}
                    setSelectedSignals={setSelectedSignals}
                    selectedMachines={selectedMachines}
                    setSelectedMachines={setSelectedMachines}
                    selectedIntervals={selectedIntervals}
                    setSelectedIntervals={setSelectedIntervals}
                    selectedActions={selectedActions}
                    setSelectedActions={setSelectedActions}
                    fromDate={fromDate}
                    toDate={toDate}
                    setFromDate={setFromDate}
                    setToDate={setToDate}
                    includeMinClose={includeMinClose}
                    setIncludeMinClose={setIncludeMinClose}
                    signalRadioMode={signalRadioMode}
                    setSignalRadioMode={setSignalRadioMode}
                    machineRadioMode={machineRadioMode}
                    setMachineRadioMode={setMachineRadioMode}
                    intervalRadioMode={intervalRadioMode}
                    setIntervalRadioMode={setIntervalRadioMode}
                    actionRadioMode={actionRadioMode}
                    setActionRadioMode={setActionRadioMode}
                    signalToggleAll={signalToggleAll}
                    setSignalToggleAll={setSignalToggleAll}
                    machineToggleAll={machineToggleAll}
                    setMachineToggleAll={setMachineToggleAll}
                    machines={machines}
                    dateKey={dateKey}
                    setDateKey={setDateKey}
                    assignedCount={getFilteredForTitle["Assigned_New"]?.length || 0}
                  />
                  <div className="flex items-center ml-6 space-x-3">
                    <span className="text-sm font-semibold text-black">Layout:</span>
                    <button
                      onClick={() => {
                        const newOption = Math.max(1, layoutOption - 1);
                        setLayoutOption(newOption);
                        localStorage.setItem("layoutOption", newOption);
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-black px-2 py-1 rounded"
                    >
                      ➖
                    </button>
                    &nbsp;&nbsp;
                    <button
                      onClick={() => {
                        const newOption = Math.min(14, layoutOption + 1); // 🚀 Increase up to 14
                        setLayoutOption(newOption);
                        localStorage.setItem("layoutOption", newOption);
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-black px-2 py-1 rounded"
                    >
                      ➕
                    </button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setFontSizeLevel(prev => {
                          const newLevel = Math.max(1, prev - 1);
                          localStorage.setItem("fontSizeLevel", newLevel);
                          return newLevel;
                        })}
                        className="bg-gray-300 hover:bg-gray-400 text-black px-2 py-1 rounded"
                        aria-label="Decrease font size"
                      >
                        ➖
                      </button>
                      <span className="text-sm font-semibold text-black">Font: {fontSizeLevel}</span>
                      <button
                        onClick={() => setFontSizeLevel(prev => {
                          const newLevel = Math.min(20, prev + 1);
                          localStorage.setItem("fontSizeLevel", newLevel);
                          return newLevel;
                        })}
                        className="bg-gray-300 hover:bg-gray-400 text-black px-2 py-1 rounded"
                        aria-label="Increase font size"
                      >
                        ➕
                      </button>
                    </div>
                    {/* ChartGrid Toggle Button */}
                    {/* Removed Show Chart Grid button and its logic */}
                    <span className="text-green-600 text-[16px] font-bold block text-left mb-1">
                      ➤ Assigned New:</span> <span
                      className="text-red-600 text-[34px] font-bold block text-left mb-1 cursor-pointer hover:underline"
                      title="Click to view Assigned Trades"
                      onClick={() => {
                        setSelectedBox((prev) => {
                          const next = prev === "Assigned_New" ? null : "Assigned_New";
                          if (next) {
                            setActiveSubReport("assign");
                            setTimeout(() => {
                              const section = document.getElementById("tableViewSection");
                              if (section) section.scrollIntoView({ behavior: "smooth" });
                            }, 0);
                          }
                          return next;
                        });
                      }}
                    >
                      {filteredTradeData.filter(trade => trade.Type === "assign").length}
                    </span>
                  </div>
                  {/* ✅ Dashboard Cards */}
                  {metrics && (
                    <div
                      className="grid gap-6 w-full px-2 py-4"
                      style={{
                        gridTemplateColumns: `repeat(${layoutOption}, minmax(0, 1fr))`,
                        transition: 'all 0.3s ease-in-out',
                      }}
                    >
                      {Object.entries(metrics).map(([title, value]) => {
                        const normalizedKey = title.trim().replace(/\s+/g, "_");
                        return (
                          <div key={normalizedKey} className="relative">
                            <DashboardCard
                              title={title}
                              value={value}
                              isSelected={selectedBox === normalizedKey}
                              onClick={() => {
                                const hasData = getFilteredForTitle[normalizedKey];
                                setSelectedBox(prev =>
                                  prev === normalizedKey || !hasData ? null : normalizedKey
                                );
                              }}
                              filteredTradeData={filteredTradeData}
                              className="bg-white dark:bg-[#181a20] border border-gray-200 dark:border-gray-800"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* ChartGrid Component */}
                  {/* Removed ChartGrid component rendering and its logic */}
                  {/* ✅ Machine Filter with Mode Toggle */}
                  {/* --- Render metrics/cards here as before --- */}
                  {/* ✅ TableView always rendered below dashboard, default to Total Profit if nothing selected */}
                  <div className="mt-6">
                    {selectedBox && (() => {
                      const normalizedKey = selectedBox?.trim().replace(/\s+/g, "_");
                      const data = getFilteredForTitle[normalizedKey];
                      if (data && data.length > 0) {
                        return (
                          <div className="mt-6">
                            <TableView
                              title={selectedBox}
                              tradeData={data}
                              clientData={clientData}
                              logData={logData}
                              activeSubReport={activeSubReport}
                              setActiveSubReport={setActiveSubReport}
                            />
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-center text-gray-500 mt-4">
                            ⚠️ No relevant data available for {selectedBox.replace(/_/g, " ")}
                          </p>
                        );
                      }
                    })()}
                  </div>
                  <div className="my-4">
                    {/* Removed Open Custom Chart Grid (New Tab) button */}
                  </div>
                </div>
              </div>
            </div>
          </>
        } />
      </Routes>
  );
};

export default App;
   