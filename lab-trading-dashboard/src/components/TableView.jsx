// TradingView interval mapping for chart grid view
const intervalMap = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "1d": "D"
};

// Helper functions for consistent data parsing
const parseHedge = (hedgeValue) => {
  if (hedgeValue === true || hedgeValue === "true" || hedgeValue === 1 || hedgeValue === "1") return true;
  if (hedgeValue === false || hedgeValue === "false" || hedgeValue === 0 || hedgeValue === "0" || 
      hedgeValue === null || hedgeValue === undefined) return false;
  if (typeof hedgeValue === 'string') {
    const numValue = parseFloat(hedgeValue);
    return !isNaN(numValue) && numValue > 0;
  }
  return false;
};

const parseBoolean = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (typeof value === 'string') {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 0;
  }
  return false;
};

// ReportList.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";

import * as XLSX from "xlsx";
import { Home, BarChart, FileText, Menu } from "lucide-react";
// Remove: Users, X, Plus, Space, ChartGridView (not used in main view)


const safeFixed = (val, digits = 2, prefix = "") => {
  const num = parseFloat(val);
  return isNaN(num) ? "N/A" : `${prefix}${num.toFixed(digits)}`;
};


const formatTradeData = (trade, index) => ({
  "S No": index + 1,
  "M.Id": trade.machineid || "N/A",
  "📋": "copy", // Copy button column
  Unique_ID: trade.unique_id || "N/A",
  "Candle_🕒": trade.candel_time,
  "Fetcher_🕒": trade.fetcher_trade_time,
  "Operator_🕒": trade.operator_trade_time,
  Pair: trade.pair
    ? `<div style="display:flex; flex-direction:column; align-items:center;">
        <a href="https://www.binance.com/en/futures/${trade.pair}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:underline;">${trade.pair}</a>
        <button onclick="window.open('https://www.tradingview.com/chart/?symbol=BINANCE:${trade.pair}.P', '_blank')" style="margin-top:2px;font-size:10px;padding:2px 6px;background:#eee;border:1px solid #aaa;border-radius:4px;cursor:pointer;">
          📈 Chart
        </button>
      </div>`
    : "N/A",
  "⏱️": trade.interval || "N/A",
  "💼": trade.action || "N/A",
  PL: safeFixed(trade.pl_after_comm, 2),
  "🛡️_BUY": safeFixed(trade.hedge_buy_pl, 2),
  "🛡️_SELL": safeFixed(trade.hedge_sell_pl, 2),
  Type: trade.type || "N/A",
  "Operator_🕒❌": trade.operator_close_time,
  "📡": trade.signalfrom || "N/A",
  PJ: (() => {
    const val = trade.profit_journey;
    // Handle boolean, string boolean, or numeric values
    const isTrue = val === true || val === "true" || val === 1 || (typeof val === 'string' && parseFloat(val) > 0);
    return isTrue ? "✅" : "❌";
  })(),
  CJ: (() => {
    const val = trade.commision_journey;
    // Handle boolean, string boolean, or numeric values  
    const isTrue = val === true || val === "true" || val === 1 || (typeof val === 'string' && parseFloat(val) > 0);
    return isTrue ? "✅" : "❌";
  })(),
  Stop_Price: safeFixed(trade.stop_price, 6),
  Save_Price: safeFixed(trade.save_price, 6),
  Min_Comm: safeFixed(trade.min_comm, 6),
  "🛡️": parseHedge(trade.hedge) ? "✅ Yes" : "❌ No",
  "🛡️1-1": parseBoolean(trade.hedge_1_1_bool) ? "✅ Yes" : "❌ No",
  "🛡️_Order_Size": trade.hedge_order_size || "N/A",
  "Min_Comm_After_🛡️": safeFixed(trade.min_comm_after_hedge, 6),
  Min_Profit: safeFixed(trade.min_profit, 2, "$"),
  Buy_Qty: trade.buy_qty || 0,
  Buy_Price: safeFixed(trade.buy_price, 6),
  Buy_PL: safeFixed(trade.buy_pl, 6),
  Added_Qty: trade.added_qty || "N/A",
  Sell_Qty: trade.sell_qty || 0,
  Sell_Price: safeFixed(trade.sell_price, 6),
  Sell_PL: safeFixed(trade.sell_pl, 6),
  Close_Price: safeFixed(trade.close_price, 6),
  Commission: safeFixed(trade.commission, 2, "$"),
  Date: trade.candel_time ? trade.candel_time.split(" ")[0] : "N/A",
  Investment: safeFixed(trade.investment, 2, "$"),
  Swing1: safeFixed(trade.swing1, 6),
  Swing2: safeFixed(trade.swing2, 6),
  Swing3: safeFixed(trade.swing3, 6),
  Swing4: safeFixed(trade.swing4, 6),
  Swing5: safeFixed(trade.swing5, 6),
  HSHighP : safeFixed(trade.hedge_swing_high_point, 6),
  HSLowP : safeFixed(trade.hedge_swing_low_point, 6),
  THighP : safeFixed(trade.temp_high_point, 6),
  TlowP : safeFixed(trade.temp_low_point, 6)
});

const TableView =  ({ title, tradeData, clientData, activeSubReport, setActiveSubReport }) => {
  // Chart settings state, persisted to localStorage
  const [chartSettings, setChartSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("chartSettings");
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        layout: parsed.layout ?? 3,
        showVolume: parsed.showVolume ?? false,
        showRSI: parsed.showRSI ?? false,
        showMACD: parsed.showMACD ?? true,
        height: parsed.height ?? 500,
        interval: parsed.interval ?? "15",
      };
    } catch {
      return { layout: 3, showVolume: false, showRSI: false, showMACD: true, height: 500, interval: "15" };
    }
  });
  useEffect(() => {
    localStorage.setItem("chartSettings", JSON.stringify(chartSettings));
  }, [chartSettings]);
  // Remarks per Pair (locally stored, persisted in localStorage)
  const [remarksMap, setRemarksMap] = useState(() => {
    const stored = localStorage.getItem("remarksMap");
    return stored ? JSON.parse(stored) : {};
  });
  // Font size for remarks textarea
  const [remarksFontSize, setRemarksFontSize] = useState(14);
  // Remarks textarea width (persisted in localStorage)
  const [remarksWidth, setRemarksWidth] = useState(() => {
    const saved = localStorage.getItem("remarksWidth");
    return saved ? parseInt(saved) : 300;
  });
  // Sync remarksMap to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("remarksMap", JSON.stringify(remarksMap));
  }, [remarksMap]);
  // Persist remarksWidth to localStorage
  useEffect(() => {
    localStorage.setItem("remarksWidth", remarksWidth);
  }, [remarksWidth]);
  // Font size state for report export
  const [reportFontSizeLevel, setReportFontSizeLevel] = useState(() => {
    const saved = localStorage.getItem("reportFontSizeLevel");
    return saved ? parseInt(saved, 10) : 3;
  });
  useEffect(() => {
    localStorage.setItem("reportFontSizeLevel", reportFontSizeLevel);
  }, [reportFontSizeLevel]);
  // Optimized sub-report click handler
  const handleSubReportClick = useCallback((type, normalizedTitle) => {
    if (normalizedTitle === "Client_Stats") {
      const filtered = clientData.filter(c => c.machineid === type);
      setFilteredData(filtered.map((client, index) => ({
        "S No": index + 1,
        "Machine ID": client.machineid || "N/A",
        "Client Name": client.name || "N/A",
        "Active": parseBoolean(client.active) ? "✅" : "❌",
        "Last Ping": client.lastping || "N/A",
        "Region": client.region || "N/A",
      })));
    } else {
      setActiveSubReport(type);
    }
  }, [clientData]);

  const [filteredData, setFilteredData] = useState([]);
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [searchInput, setSearchInput] = useState(""); // ✅ Preserve search term
  // Moved copiedField and useEffect here (see below for usage)
  const [copiedField, setCopiedField] = useState(null);
  useEffect(() => {
    if (copiedField) {
      const timer = setTimeout(() => setCopiedField(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [copiedField]);

  function updateFilterIndicators() {
    document.querySelectorAll("th .filter-icon").forEach((icon) => {
        const index = icon.getAttribute("data-index");
        if (activeFilters[index]) {
            icon.innerText = "✅"; // ✅ Or any other indicator
            icon.style.color = "green";
        } else {
            icon.innerText = "🔍";
            icon.style.color = "";
        }
    });
}
function showFilterPopup(index, event) {
  document.querySelectorAll(".filter-popup").forEach(p => p.remove());

  const values = [...document.querySelectorAll("tbody tr td:nth-child(" + (index + 1) + ")")].map(td => td.innerText.trim());
  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const unique = Object.keys(counts);

  const popup = document.createElement("div");
  popup.className = "filter-popup";

  // ✅ Apply Proper CSS immediately
  popup.style.position = "fixed";
  popup.style.background = "white";
  popup.style.color = "black";
  popup.style.padding = "12px";
  popup.style.borderRadius = "8px";
  popup.style.zIndex = "999999";
  popup.style.maxHeight = "500px";
  popup.style.overflowY = "auto";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "8px";

  const checkboxes = [];
  // Reset Button
  const reset = document.createElement("button");
  reset.innerText = "♻️ Reset Column";
  reset.onclick = (e) => {
    e.stopPropagation();
    const newFilters = { ...activeFilters };
    delete newFilters[index];
    setActiveFilters(newFilters);
    popup.remove();
  };
  popup.appendChild(reset);

  // Apply Button
  const apply = document.createElement("button");
  apply.innerText = "✅ Apply";
  apply.onclick = (e) => {
    e.stopPropagation();
    const sel = checkboxes.filter(c => c.checked).map(c => c.value);
    activeFilters[index] = sel.length === unique.length ? undefined : sel;
    setActiveFilters({ ...activeFilters });
    popup.remove();
    updateFilterIndicators();
  };
  popup.appendChild(apply);

  // Select All Button
  const selectAll = document.createElement("button");
  selectAll.innerText = "✅ Select All";
  selectAll.style.backgroundColor = "#4caf50";
  selectAll.style.color = "white";
  let allSelected = true;
  selectAll.onclick = () => {
    allSelected = !allSelected;
    checkboxes.forEach(cb => cb.checked = allSelected);
    selectAll.innerText = allSelected ? "✅ Select All" : "❌ Deselect All";
    selectAll.style.backgroundColor = allSelected ? "#4caf50" : "#f44336";
  };
  popup.appendChild(selectAll);

  // Checkboxes
  unique.forEach(v => {
    const label = document.createElement("label");

    // ✅ Force nice vertical + spacing
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "6px";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = v;
    input.checked = true;

    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${v} (${counts[v]})`));
    popup.appendChild(label);
    checkboxes.push(input);
  });

  document.body.appendChild(popup);

  // ✅ Proper Popup Placement
  const icon = event.target;
  const rect = icon.getBoundingClientRect();

  popup.style.top = `${rect.bottom + 10}px`;
  popup.style.left = `${rect.left}px`;

  // Close logic
  setTimeout(() => {
    const closePopup = (ev) => {
      if (!popup.contains(ev.target)) {
        popup.remove();
        document.removeEventListener("click", closePopup);
      }
    };
    document.addEventListener("click", closePopup);
  }, 100);
}


function showCopyPopup(text, x, y) {
  let popup = document.getElementById("copyPopup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "copyPopup";
    popup.innerText = " Copy Selected";

    popup.style.position = "fixed";
    popup.style.background = "black";
    popup.style.color = "white";
    popup.style.padding = "10px 20px";
    popup.style.borderRadius = "8px";
    popup.style.fontSize = "13px";
    popup.style.fontWeight = "bold";
    popup.style.cursor = "pointer";
    popup.style.zIndex = "999999";
    popup.style.opacity = "1";
    popup.style.pointerEvents = "auto";
    popup.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
    popup.style.userSelect = "none";
    popup.style.transition = "opacity 0.3s ease, transform 0.2s ease";

    // ✅ Hover effect
    popup.addEventListener("mouseenter", () => {
      popup.style.backgroundColor = "#333";
      popup.style.transform = "scale(1.05)";
    });
    popup.addEventListener("mouseleave", () => {
      popup.style.backgroundColor = "black";
      popup.style.transform = "scale(1)";
    });

    // ✅ Click → Copy
    popup.addEventListener("click", (e) => {
      e.stopPropagation();  // prevent click outside listener to trigger
      navigator.clipboard.writeText(text).then(() => {
        popup.innerText = "✅ Copied!";
        setTimeout(() => {
          if (popup) popup.remove();
        }, 800);
      });
    });

    document.body.appendChild(popup);
  }

  // Place the popup at the requested (x, y) position, fixed and keep it there
  popup.style.left = `${x - window.scrollX}px`;
  popup.style.top = `${y - window.scrollY}px`;
  popup.style.display = "block";
  popup.style.opacity = "1";

  // ✅ Close on outside click
  const closePopup = (event) => {
    if (!popup.contains(event.target)) {
      popup.remove();
      document.removeEventListener("click", closePopup);
    }
  };
  setTimeout(() => {
    document.addEventListener("click", closePopup);
  }, 10);
}



useEffect(() => {
  const handleMouseUp = (e) => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();

    if (!text) {
      const existingPopup = document.getElementById("copyPopup");
      if (existingPopup) existingPopup.remove();
      return;
    }

    setTimeout(() => {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Position popup centered below the selection, like exported report
        const x = rect.left + window.scrollX + rect.width / 2;
        const y = rect.bottom + window.scrollY + 10;

        showCopyPopup(text, x, y);
      } catch (err) {
        console.error("Copy popup positioning error:", err);
      }
    }, 0);
  };

  document.addEventListener("mouseup", handleMouseUp);

  return () => {
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, []);




useEffect(() => {
  const handleClickOutside = (e) => {
    const popups = document.querySelectorAll(".filter-popup");
    popups.forEach(popup => {
      if (!popup.contains(e.target)) {
        popup.remove();
        setActivePopupIndex(null);
      }
    });
  };

  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, []);



const filteredAndSortedData = useMemo(() => {
  // First apply filters
  let data = [...filteredData];

  Object.entries(activeFilters).forEach(([index, selectedValues]) => {
    if (!selectedValues) return;

    const columnIndex = parseInt(index);

    data = data.filter(row => {
      const keys = Object.keys(row);
      const key = keys[columnIndex];
      const value = row[key]?.toString().trim();
      return selectedValues.includes(value);
    });
  });

  // Then apply sorting
  if (!sortConfig.key) return data;

  return [...data].sort((a, b) => {
    const aVal = a[sortConfig.key] || "";
    const bVal = b[sortConfig.key] || "";

    if (!isNaN(aVal) && !isNaN(bVal)) {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortConfig.direction === 'asc'
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });
}, [filteredData, sortConfig, activeFilters]);
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";

      if (!isNaN(aVal) && !isNaN(bVal)) {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [filteredData, sortConfig]);

useEffect(() => {
  console.log("🔍 TableView useEffect - title:", title, "tradeData length:", tradeData?.length);
  if (!title || !tradeData || tradeData.length === 0) return;

  // ✅ Apply filtering on raw trade data BEFORE formatting
  let filteredTrades = [...tradeData];

  // ✅ Apply sub-report filtering on raw trade data
  switch (title) {
    case "Total_Closed_Stats":
      filteredTrades = filteredTrades.filter(trade => trade.type === "close" || trade.type === "hedge_close");
      break;
    case "Direct_Closed_Stats":
      filteredTrades = filteredTrades.filter(trade => {
        const isHedge = parseHedge(trade.hedge);
        return trade.type === "close" && !isHedge;
      });
      break;
    case "Hedge_Closed_Stats":
      filteredTrades = filteredTrades.filter(trade => {
        const isHedge = parseHedge(trade.hedge);
        return trade.type === "hedge_close" && isHedge;
      });
      break;
    case "Total_Running_Stats":
      filteredTrades = filteredTrades.filter(trade => trade.type === "running" || trade.type === "hedge_hold");
      break;
    case "Assigned_New":
      filteredTrades = filteredTrades.filter(trade => trade.type === "assign");
      break;
    case "Direct_Running_Stats":
      filteredTrades = filteredTrades.filter(trade => {
        const isHedge = parseHedge(trade.hedge);
        return (trade.type === "running" || trade.type === "hedge_hold") && !isHedge;
      });
      break;
    case "Hedge_Running_Stats":
      filteredTrades = filteredTrades.filter(trade => {
        const isHedge = parseHedge(trade.hedge);
        const isHedge11 = parseBoolean(trade.hedge_1_1_bool);
        return (trade.type === "running" || trade.type === "hedge_hold") && isHedge && !isHedge11;
      });
      break;
    case "Hedge_on_Hold":
      filteredTrades = filteredTrades.filter(trade => {
        const isHedge = parseHedge(trade.hedge);
        const isHedge11 = parseBoolean(trade.hedge_1_1_bool);
        return (trade.type === "running" || trade.type === "hedge_hold") && isHedge && isHedge11;
      });
      break;
    case "Closed_Count_Stats":
      filteredTrades = filteredTrades.filter((trade) => {
        if (activeSubReport === "loss") return trade.type === "close" && trade.pl_after_comm < 0;
        if (activeSubReport === "profit") return trade.type === "close" && trade.pl_after_comm > 0;
        if (activeSubReport === "pj") {
          const isProfitJourney = parseBoolean(trade.profit_journey);
          return trade.type === "close" && isProfitJourney;
        }
        return true;
      });
      break;
    case "Buy_Sell_Stats":
      filteredTrades = filteredTrades.filter((trade) => {
        if (!["BUY", "SELL"].includes(trade.action)) return false;
        if (activeSubReport === "buy") return trade.action === "BUY";
        if (activeSubReport === "sell") return trade.action === "SELL";
        return true;
      });
      break;
    case "Journey_Stats_Running":
      filteredTrades = filteredTrades.filter((trade) => {
        const isProfitJourney = parseBoolean(trade.profit_journey);
        const isCommisionJourney = parseBoolean(trade.commision_journey);
        if (activeSubReport === "pj") return isProfitJourney && trade.pl_after_comm > 0 && (trade.type === "running" || trade.type === "hedge_hold");
        if (activeSubReport === "cj") return isCommisionJourney && trade.pl_after_comm > 0 && (trade.type === "running" || trade.type === "hedge_hold") && !isProfitJourney;
        if (activeSubReport === "bc") return trade.pl_after_comm < 0 && (trade.type === "running" || trade.type === "hedge_hold");
        return true;
      });
      break;
    case "Client_Stats":
      // Special case: handle client data separately
      const clientResult = clientData.map((client, index) => ({
        "S No": index + 1,
        "Machine ID": client.machineid || "N/A",
        "Client Name": client.name || "N/A",
        "Active": parseBoolean(client.active) ? "✅" : "❌",
        "Last Ping": client.lastping || "N/A",
        "Region": client.region || "N/A",
      }));
      setFilteredData(clientResult);
      return;
    case "Min_Close_Profit":
      filteredTrades = filteredTrades.filter(trade => trade.type === "close" && trade.min_close === "Min_close" && trade.pl_after_comm > 0);
      break;
    case "Min_Close_Loss":
      filteredTrades = filteredTrades.filter(trade => trade.type === "close" && trade.min_close === "Min_close" && trade.pl_after_comm < 0);
      break;
    default:
      console.log("⚠️ TableView - No case match for title:", title);
      break;
  }

  console.log("🔍 TableView after switch - filteredTrades length:", filteredTrades.length);
  
  // Format the filtered trade data with correct sequential indexing
  let result = filteredTrades.map((trade, index) => formatTradeData(trade, index));

  // Always apply search filter regardless of title
  const query = searchInput.trim().toLowerCase();
  if (query.length > 0) {
    result = result.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(query)
      )
    );
  }

  console.log("🔍 TableView final result length:", result.length);
  console.log("🔍 TableView final result sample:", result.slice(0, 1));
  setFilteredData(result);
}, [title, tradeData, activeSubReport, clientData, searchInput]);

  const handleOpenReport = (title, sortedData, fontSizeLevel = 3) => {
    if (!sortedData || sortedData.length === 0) return;
    const reportWindow = window.open("", "_blank", "width=1200,height=600");
    const tableHeaders = Object.keys(sortedData[0]);
    // -- Removed the block from <div style="text-align:center; padding:10px;"> ... </script> as per instructions --
    // Instead, just render a minimal table for the report (for demonstration)
    const reportContent = `
  <html>
  <head>
  <title>${title.replace(/_/g, " ")} Report</title>
  <style>
  body { font-family: Arial; margin:20px; background:#f2f2f7; font-size: ${12 + (fontSizeLevel - 8) * 2}px; }
  table { width:100%; border-collapse: collapse; cursor:pointer; }
  th, td { padding:6px 8px; border-bottom:1px solid #ccc; text-align:center; }
  th { background:#288994; color:white; position:sticky; top:0; z-index:3; }
  </style>
  </head>
  <body>
  
    <table>
      <thead>
        <tr>
          ${tableHeaders.map(h => `<th>${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${sortedData.map(row =>
          `<tr>${tableHeaders.map(h => `<td>${row[h]}</td>`).join("")}</tr>`
        ).join("")}
      </tbody>
    </table>
  </body>
  </html>
  `;
    reportWindow.document.write(reportContent);
  };


  

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };



  // Add conditional early return to prevent unnecessary rendering
  // (Moved subReportButtons below to allow always showing buttons even if no data)

  // --- Sub-report filter button logic, always above early return for filteredData ---
  const normalizedTitle = title.replace(/\s+/g, "_").trim();
  let options = [];

  switch (normalizedTitle) {
    
    
    case "Closed_Count_Stats":
      options = ["loss", "profit", "pj"];
      break;
    case "Buy_Sell_Stats":
      options = ["buy", "sell"];
      break;
    case "Journey_Stats_Running":
      options = ["pj", "cj", "bc"];
      break;
    case "Client_Stats":
      options = clientData.map(client => client.MachineId);
      break;
    default:
      options = [];
  }

  const subReportButtons = options.length > 0 && (
    <div className="flex gap-2 mb-2">
      {options.map((type) => (
        <button
          key={type}
          onClick={() => handleSubReportClick(type, normalizedTitle)}
          className={`px-3 py-1 text-sm rounded transition-all duration-150 ease-in-out ${
            activeSubReport === type
              ? "bg-yellow-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {type.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const query = searchInput?.trim()?.toLowerCase();
  const isQueryActive = query && query.length > 0;
  const isFilteredEmpty = filteredData.length === 0;
  console.log("🔍 TableView render - filteredData.length:", filteredData.length);

  if (isFilteredEmpty && !isQueryActive) {
    return (
      <div className="mt-6 p-6 bg-[#f2f2f7] text-[#222] shadow-md rounded-lg max-w-full">
        {/* <h2 className="text-xl font-bold">{title.replace(/_/g, " ")} Details</h2> */}
        <div className="flex gap-2 my-4">
          <input
            type="text"
            placeholder="🔍 Type to search..."
            value={searchInput}
            onChange={(e) => {
              const value = e.target.value.toLowerCase();
              setSearchInput(e.target.value);
              const filtered = tradeData.filter(row =>
                Object.values(row).some(val =>
                  String(val).toLowerCase().includes(value)
                )
              );
              setFilteredData(filtered);
            }}
            className="px-3 py-2 border rounded-md w-64 text-sm dark:bg-black dark:text-white"
          />
          <button
            onClick={() => {
              setActiveFilters({});
              setFilteredData(tradeData);
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
          >
            ♻️ Reset Filters
          </button>
          {subReportButtons}
        </div>
        <p className="text-center text-gray-500 mt-4">⚠️ No relevant data available for {title}</p>
      </div>
    );
  }
  const getStickyClass = (index) => {
    if (index === 0)
      return "sticky left-0 z-[5] bg-[#046e7a] text-white min-w-[110px] max-w-[110px]";
    if (index === 1)
      return "sticky left-[110px] z-[5] bg-[#046e7a] text-white min-w-[130px] max-w-[130px]";
    if (index === 2)
  return "sticky left-[190px] z-[5] bg-[#046e7a] text-white min-w-[130px] max-w-[130px]";
    return "";
  };

  // Extract unique base symbols for ChartGrid (from filteredData)
  const extractSymbolsForChartGrid = () => {
    if (!filteredData || !Array.isArray(filteredData)) return ['BTCUSDT', 'ETHUSDT'];
    const symbols = [...new Set(
      filteredData
        .filter(row => row.Pair)
        .map(row => {
          let s = row.Pair;
          if (typeof s === 'string') {
            s = s.replace(/<[^>]+>/g, '').toUpperCase().trim();
            if (s.startsWith('BINANCE')) s = s.slice(7);
            s = s.split('_')[0];
          }
          return s;
        })
        .filter(s => s)
    )];
    // Log for debugging
    console.log('ChartGrid Base Symbols:', symbols);
    return symbols.length ? symbols : ['BTCUSDT', 'ETHUSDT'];
  };


return (
  <div
    className="mt-6 p-6 bg-[#f5ecd7] dark:bg-[#181a20] text-[#222] dark:text-white shadow-md rounded-lg max-w-full"
    // style={{ fontSize: `${12 + (reportFontSizeLevel - 2) * 2}px` }}
  >
    {/* Log Path Input Block */}
    {/* Removed Log Path button, display, and LogSettingsPopup */}
    {/* Font size plus/minus group for report export */}
    {/* --- Info Block Above Toolbar --- */}
    {/* --- Compact Icon Toolbar with Copyable Info Block --- */}
    <div className="flex flex-wrap items-center gap-2 w-full bg-gradient-to-r from-gray-100 via-white to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl shadow-md p-3 mb-2 transition-colors duration-300" style={{ marginBottom: 0, paddingBottom: 0 }}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setReportFontSizeLevel(prev => Math.max(1, prev - 1))}
          className="bg-gray-200 text-black p-2 rounded flex items-center justify-center transition-all duration-150"
          title="Decrease Font Size"
        >
          <span className="sr-only">Decrease Font Size</span>
          <span style={{ fontSize: 18 }}>A−</span>
        </button>
        <button
          onClick={() => setReportFontSizeLevel(prev => Math.min(20, prev + 1))}
          className="bg-gray-200 text-black p-2 rounded flex items-center justify-center transition-all duration-150"
          title="Increase Font Size"
        >
          <span className="sr-only">Increase Font Size</span>
          <span style={{ fontSize: 18 }}>A+</span>
        </button>
        <button
          onClick={() => handleOpenReport(title, sortedData, reportFontSizeLevel)}
          className="bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 text-white p-2 rounded flex items-center justify-center gap-1 transition-all duration-150"
          title="Open in New Tab"
        >
          <FileText size={18} />
          <span className="text-xs font-semibold">Tab</span>
        </button>
        <button
          onClick={() => {
            const symbols = extractSymbolsForChartGrid();
            const trades = filteredAndSortedData;
            const tab = window.open('/chart-grid', '_blank');
            localStorage.setItem('chartGridSymbols', JSON.stringify(symbols));
            localStorage.setItem('chartGridTrades', JSON.stringify(trades));
            setTimeout(() => {
              const channel = new BroadcastChannel('chart-grid-data');
              channel.postMessage({ symbols, trades });
              channel.close();
            }, 500);
          }}
          className="bg-purple-600 hover:bg-purple-700 focus:ring-2 focus:ring-purple-400 text-white p-2 rounded flex items-center justify-center gap-1 transition-all duration-150"
          title="Chart Grid"
        >
          <BarChart size={18} />
          <span className="text-xs font-semibold">Chart</span>
        </button>
        <input
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => {
            const value = e.target.value.toLowerCase();
            setSearchInput(e.target.value);
            const filtered = tradeData.filter(row =>
              Object.values(row).some(val =>
                String(val).toLowerCase().includes(value)
              )
            );
            setFilteredData(filtered);
          }}
          className="px-3 py-2 border rounded-md w-48 text-sm focus:ring-2 focus:ring-blue-400 transition-all duration-150 dark:bg-black dark:text-white"
          title="Search"
        />
        <button
          onClick={() => {
            const dataForExport = filteredAndSortedData.map((item) => {
              let cleanPair = item.Pair;
              if (typeof cleanPair === "string") {
                cleanPair = cleanPair.replace(/<[^>]+>/g, "");
              }
              return {
                ...item,
                Pair: cleanPair,
                Remarks: remarksMap[cleanPair] || "",
              };
            });
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dataForExport);
            XLSX.utils.book_append_sheet(wb, ws, "Dashboard Report");
            XLSX.writeFile(wb, "Dashboard_Trade_Report.xlsx");
          }}
          className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-400 text-white p-2 rounded flex items-center justify-center gap-1 transition-all duration-150"
          title="Export to Excel"
        >
          <Home size={18} />
          <span className="text-xs font-semibold">Excel</span>
        </button>
        <button
          onClick={() => {
            setActiveFilters({});
            setFilteredData(tradeData);
            setSelectedIntervals({
              "1m": true,
              "3m": true,
              "5m": true,
              "15m": true,
              "30m": true,
              "1h": true,
              "4h": true,
              "1d": true,
            });
            if (typeof setGlobalInterval === "function") setGlobalInterval(null);
            localStorage.removeItem("globalInterval");
            setTimeout(() => {
              document.querySelectorAll('input[name="interval-radio"]').forEach((el) => {
                el.checked = false;
              });
            }, 0);
          }}
          className="bg-yellow-600 hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-400 text-white p-2 rounded flex items-center justify-center gap-1 transition-all duration-150"
          title="Reset Filters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.582 9A7.978 7.978 0 014 12c0 4.418 3.582 8 8 8a7.978 7.978 0 006.418-3M15 9V4h5m-1.418 5A7.978 7.978 0 0020 12c0 4.418-3.582 8-8 8a7.978 7.978 0 01-6.418-3" /></svg>
          <span className="text-xs font-semibold">Reset</span>
        </button>
        {selectedRow !== null && (() => {
          const selectedData = filteredAndSortedData[selectedRow] || {};
          const fieldsToDisplay = ["Stop_Price", "Save_Price", "Buy_Price", "Sell_Price"];
          let cleanPair = selectedData.Pair;
          if (typeof cleanPair === "string") {
            cleanPair = cleanPair.replace(/<[^>]+>/g, "");
          }
          return (
            <div className="flex flex-wrap items-center gap-3 p-1 border border-gray-300 bg-white dark:bg-gray-800 rounded text-sm ml-2 transition-all duration-150">
              {fieldsToDisplay.map((field) => {
                const displayVal = selectedData[field] || "N/A";
                return (
                  <div key={field} className="flex items-center gap-1">
                    <span className="font-medium text-gray-800 dark:text-gray-200" style={{ fontSize: '16px' }}>{field.replace(/_/g, " ")}:</span>
                    <button
                      className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-150"
                      style={{ fontSize: '16px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(displayVal);
                        setCopiedField(field);
                      }}
                    >
                      {copiedField === field ? "✅ Copied!" : `${displayVal} `}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
    {/* --- End Compact Icon Toolbar with Copyable Info Block --- */}
    {/* --- Remarks Section Directly Below Toolbar --- */}
    <div className="w-full flex items-start gap-2" style={{ marginBottom: 0, paddingBottom: 0 }}>
      <div className="flex flex-col items-center justify-between h-full">
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm mb-1 dark:bg-black dark:text-white"
          onClick={() => setRemarksFontSize((prev) => Math.min(30, prev + 2))}
        >
          A+
        </button>
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm mt-1 dark:bg-black dark:text-white"
          onClick={() => setRemarksFontSize((prev) => Math.max(10, prev - 2))}
        >
          A−
        </button>
      </div>
      <textarea
        className="border border-gray-300 rounded p-2 resize-y w-full min-h-[48px] max-h-[200px] transition-all duration-200 dark:bg-black dark:text-white"
        style={{ fontSize: `${remarksFontSize}px`, marginBottom: 0, paddingBottom: 0 }}
        placeholder={selectedRow === null ? "Select a row to add remarks" : "Write your remarks here..."}
        value={(() => {
          if (selectedRow === null) return "";
          const selectedData = filteredAndSortedData[selectedRow] || {};
          let cleanPair = selectedData.Pair;
          if (typeof cleanPair === "string") {
            cleanPair = cleanPair.replace(/<[^>]+>/g, "");
          }
          return remarksMap[cleanPair] || "";
        })()}
        onChange={e => {
          if (selectedRow === null) return;
          const selectedData = filteredAndSortedData[selectedRow] || {};
          let cleanPair = selectedData.Pair;
          if (typeof cleanPair === "string") {
            cleanPair = cleanPair.replace(/<[^>]+>/g, "");
          }
          setRemarksMap(prev => ({ ...prev, [cleanPair]: e.target.value }));
        }}
        disabled={selectedRow === null}
      />
    </div>
    {/* --- End Remarks Section Directly Below Toolbar --- */}
    {/* Interval radio group for global chart grid interval */}
   
    {/* 📊 Chart Grid View Button and ⚙️ Chart Settings */}
   
    {/* ✅ SEARCH, EXPORT, RESET FILTER BAR */}

    
    <div
      className="flex flex-wrap items-center gap-4"
      style={{ fontSize: `${12 + (reportFontSizeLevel - 3) * 2}px` }}
    >
      {/* Removed Chart Grid (symbols) button and its logic */}
      <div style={{ minHeight: "40px" }}>
        {/* Removed the info block from here */}
      </div>
    </div>

    {/* Search/Export/Reset group */}
  
{(() => {
  const normalizedTitle = title.replace(/\s+/g, "_").trim();
  let options = [];

  switch (normalizedTitle) {
    
    case "Closed_Count_Stats":
      options = ["loss", "profit", "pj"];
      break;
    case "Buy_Sell_Stats":
      options = ["buy", "sell"];
      break;
    case "Journey_Stats_Running":
      options = ["pj", "cj", "bc"];
      break;
    case "Client_Stats":
      options = clientData.map(client => client.MachineId);
      break;
    default:
      options = [];
  }
  

  

  return options.length > 0 ? (
    <div className="flex gap-2 mb-2">
      {options.map((type) => (
        <button
          key={type}
          onClick={() => handleSubReportClick(type, normalizedTitle)}
          className={`px-3 py-1 text-sm rounded transition-all duration-150 ease-in-out ${
            activeSubReport === type
              ? "bg-yellow-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {type.toUpperCase()}
        </button>
      ))}
      
    </div>
  ) : null;
})()}
  

    {/* ✅ Table with Sorting */}
    <div className="overflow-auto max-h-[600px] border border-gray-300 rounded-lg bg-[#f5ecd7] dark:bg-[#181a20]">
      <table
        className="w-full border-collapse"
        style={{ fontSize: `${12 + (reportFontSizeLevel - 3) * 2}px` }}
      >
      
        <thead
          className="sticky top-0 z-30 bg-teal-700 text-white"
          style={{ fontSize: "inherit" }}
        >
          <tr>
            {Object.keys(sortedData[0] || {}).map((key, index) => {
              const isSticky = index < 4; // Updated to include copy column
              const isCopyColumn = key === "📋";
              return (
                <th
                  key={key}
                  onClick={isCopyColumn ? undefined : () => handleSort(key)}   // Copy column is not sortable
                  className={`relative px-4 py-2 text-left whitespace-nowrap ${
                    isCopyColumn ? "cursor-default" : "cursor-pointer"
                  } ${
                    index === 0 && "min-w-[50px] max-w-[50px] sticky left-0 bg-teal-700 text-white z-[5]"
                  } ${
                    index === 1 && "min-w-[60px] max-w-[60px] sticky left-[50px] bg-teal-700 text-white z-[5]"
                  } ${
                    index === 2 && "min-w-[30px] max-w-[30px] sticky left-[110px] bg-teal-700 text-white z-[5] text-center"
                  } ${
                    index === 3 && "min-w-[170px] max-w-[170px] sticky left-[140px] bg-teal-700 text-white z-[5]"
                  }`}
                  style={{ fontSize: "inherit" }}
                >
                  <div className="flex items-center justify-between">
                    <span>{key.replace(/_/g, " ")}</span>

                    {/* Only Visual Sort Icon (no click needed inside it!) - Hide for copy column */}
                    {!isCopyColumn && (
                      <span className="ml-1">
                        {sortConfig.key === key ? (
                          sortConfig.direction === "asc" ? (
                            <span className="text-yellow-300">🔼</span>
                          ) : (
                            <span className="text-yellow-300">🔽</span>
                          )
                        ) : (
                          <span className="opacity-60">⇅</span>
                        )}
                      </span>
                    )}

                    {/* Filter icon (keep e.stopPropagation() inside only for this) - Hide for copy column */}
                    {!isCopyColumn && (
                      <span
                        className="ml-1 cursor-pointer filter-icon"
                        data-index={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          showFilterPopup(index, e);
                        }}
                      >
                        &#128269;
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedData
            .map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className={`cursor-pointer ${
                  selectedRow === rowIndex
                    ? "bg-amber-200 dark:bg-amber-400 text-black"
                    : "hover:bg-green-200 dark:hover:bg-[#3d4451] dark:hover:text-white"
                }`}
                style={{ fontSize: `${12 + (reportFontSizeLevel - 3) * 2}px` }}
                onClick={() => setSelectedRow(prev => prev === rowIndex ? null : rowIndex)}
              >
                {Object.entries(item).map(([key, val], colIndex) =>
                  key === "Pair" ? (
                    <td
                      key={colIndex}
                      className={`
                        px-2 py-1 whitespace-nowrap align-top text-sm select-text
                        ${selectedRow === rowIndex ? 'text-amber-900' : 'text-sky-500 dark:text-yellow-300'}
                        ${colIndex === 0 && "min-w-[50px] max-w-[50px] sticky left-0 bg-[#046e7a] text-white z-[5] text-xs"}
                        ${colIndex === 1 && "min-w-[60px] max-w-[60px] sticky left-[50px] bg-[#046e7a] text-white z-[5] text-[10px] font-light"}
                        ${colIndex === 2 && "min-w-[30px] max-w-[30px] sticky left-[110px] bg-[#046e7a] text-white z-[5] text-center"}
                        ${colIndex === 3 && "min-w-[170px] max-w-[170px] sticky left-[140px] bg-[#046e7a] text-white z-[5] text-[12px] leading-snug"}
                      `}
                      style={{ fontSize: "inherit" }}
                      dangerouslySetInnerHTML={{
                        __html: selectedRow === rowIndex
                          ? val.replace(/color:(#[A-Fa-f0-9]{6}|[a-zA-Z]+)/g, 'color:#b45309')
                          : val.replace(/color:(#[A-Fa-f0-9]{6}|[a-zA-Z]+)/g, 'color:#0ea5e9')
                      }}
                    />
                  ) : key === "📋" ? (
                    <td
                      key={colIndex}
                      className={`
                        px-1 py-1 whitespace-nowrap align-top text-sm
                        ${colIndex === 2 && "min-w-[30px] max-w-[30px] sticky left-[110px] bg-[#046e7a] text-white z-[5] text-center"}
                      `}
                      style={{ fontSize: "inherit" }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const uniqueId = item.Unique_ID;
                          if (uniqueId && uniqueId !== "N/A") {
                            navigator.clipboard.writeText(uniqueId).then(() => {
                              // Show brief feedback
                              const button = e.target;
                              const originalText = button.textContent;
                              button.textContent = "✓";
                              button.className = "text-green-400 text-xs px-1 py-0.5 rounded hover:bg-gray-600 transition-all";
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.className = "text-gray-300 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-gray-600 transition-all cursor-pointer";
                              }, 1000);
                            }).catch(() => {
                              // Fallback for older browsers
                              const textArea = document.createElement('textarea');
                              textArea.value = uniqueId;
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                              
                              // Show feedback
                              const button = e.target;
                              const originalText = button.textContent;
                              button.textContent = "✓";
                              button.className = "text-green-400 text-xs px-1 py-0.5 rounded hover:bg-gray-600 transition-all";
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.className = "text-gray-300 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-gray-600 transition-all cursor-pointer";
                              }, 1000);
                            });
                          }
                        }}
                        className="text-gray-300 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-gray-600 transition-all cursor-pointer"
                        title="Click to copy Unique ID"
                      >
                        📋
                      </button>
                    </td>
                  ) : (
                    colIndex === 0 ? (
                      <td
                        key={colIndex}
                        className={`
                          px-2 py-1 whitespace-nowrap align-top text-sm select-text
                          min-w-[50px] max-w-[50px] sticky left-0 bg-[#046e7a] text-white z-[5] text-xs
                        `}
                        style={{ fontSize: "inherit" }}
                      >
                        {/* Removed log path opening functionality, just show plain text */}
                        {val}
                      </td>
                    ) : (
                      <td
                        key={colIndex}
                        className={`
                          px-2 py-1 whitespace-nowrap align-top text-sm select-text
                          ${colIndex === 1 && "min-w-[60px] max-w-[60px] sticky left-[50px] bg-[#046e7a] text-white z-[5] text-[10px] font-light"}
                          ${colIndex === 2 && "min-w-[30px] max-w-[30px] sticky left-[110px] bg-[#046e7a] text-white z-[5] text-center"}
                          ${colIndex === 3 && "min-w-[170px] max-w-[170px] sticky left-[140px] bg-[#046e7a] text-white z-[5] text-[12px] leading-snug"}
                          ${["Candle_Time", "Fetcher_Trade_Time", "Operator_Trade_Time", "Operator_Close_Time"].includes(key) ? "text-[11px]" : ""}
                          ${["Type", "Action", "Interval", "CJ", "PJ"].includes(key) ? "min-w-[60px] max-w-[60px] text-center" : ""}
                          ${key === "Unique_ID" ? "text-black" : ""}
                        `}
                        style={{ fontSize: key === "Unique_ID" ? `${8 + (reportFontSizeLevel - 2) * 2}px` : "inherit" }}
                      >
                        {key === "Unique_ID" && typeof val === "string" && val.match(/\d{4}-\d{2}-\d{2}/) ? (
                          (() => {
                            const match = val.match(/\d{4}-\d{2}-\d{2}/);
                            if (!match) return val;
                            const splitIndex = val.indexOf(match[0]);
                            const pair = val.slice(0, splitIndex);
                            const timestamp = val.slice(splitIndex).replace("T", " ");
                            return (
                              <div 
                                className="cursor-pointer font-bold text-yellow-400 hover:underline hover:text-yellow-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/live-trade-view?uid=${encodeURIComponent(val)}`, '_blank');
                                }}
                                title="Click to view live trade details"
                              >
                                <div className="leading-tight">{pair}</div>
                                <div className="opacity-80 -mt-[2px] leading-tight">{timestamp}</div>
                              </div>
                            );
                          })()
                        ) : key === "Unique_ID" && typeof val === "string" && val !== "N/A" ? (
                          <div 
                            className="cursor-pointer font-bold text-yellow-400 hover:underline hover:text-yellow-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/live-trade-view?uid=${encodeURIComponent(val)}`, '_blank');
                            }}
                            title="Click to view live trade details"
                          >
                            {val}
                          </div>
                        ) : (
                          key === "PL" ? (
                            val !== "N/A" ? (
                              <span className={
                                selectedRow === rowIndex 
                                  ? (parseFloat(val) >= 0 ? "text-green-800" : "text-black")
                                  : (parseFloat(val) >= 0 ? "text-green-400" : "text-red-400")
                              }>
                                {val}
                              </span>
                            ) : val
                          ) : key === "PL_After_Comm" && val !== "N/A" ? `$${val}` : val
                        )}
                      </td>
                    )
                  )
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
    {/* Removed ChartGridView rendering */}
    {/* --- Remarks Section Below Toolbar --- */}
    {/* Removed the remarks section rendering */}
    {/* --- End Remarks Section Below Toolbar --- */}
  </div>
);
};


export default TableView;