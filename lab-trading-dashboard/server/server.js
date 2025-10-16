const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const axios = require('axios');

const app = express();
const fs = require("fs");
let currentLogPath = "D:/Projects/blockchainProject/pythonProject/Binance/Loveleet_Anish_Bot/LAB-New-Logic/hedge_logs";
const PORT = process.env.PORT || 10000;

// ✅ Allowed Frontend Origins (Local + Vercel + Render)
const allowedOrigins = [
  "http://localhost:5173", // Local Vite
  "http://localhost:5174", // Alternate local Vite
  "https://lab-code-q0ij.onrender.com", // Your backend (if you ever serve frontend from here)
  "https://lab-code-4kbs.vercel.app", // Vercel frontend
  "https://lab-code-1.onrender.com", // Alternate Render frontend
  "https://lab-code-4kbs-git-lab-loveleets-projects-ef26b22c.vercel.app/", // Vercel preview
  "https://lab-code-4kbs-q77fv3aml-loveleets-projects-ef26b22c.vercel.app/", // Vercel preview
  // Add any other frontend URLs you use here
];

// ✅ Proper CORS Handling
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("❌ CORS blocked origin:", origin);
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());

app.post("/api/set-log-path", (req, res) => {
  const { path } = req.body;
  if (fs.existsSync(path)) {
    currentLogPath = path;
    console.log("✅ Log path updated to:", currentLogPath);
    res.json({ success: true, message: "Log path updated." });
  } else {
    res.status(400).json({ success: false, message: "Invalid path" });
  }
});

app.use("/logs", (req, res, next) => {
  express.static(currentLogPath)(req, res, next);
});

// ✅ Database Configuration
const dbConfig = {
  user: "lab",
  password: "IndiaNepal1-",
  server: "20.40.58.121",
  port: 1433,
  database: "labDB2",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// ✅ Retry SQL Connection Until Successful
async function connectWithRetry() {
  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err) {
    console.error("❌ SQL Connection Failed. Retrying in 5 seconds...", err.code || err.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectWithRetry();
  }
}

let poolPromise = connectWithRetry();

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("✅ Backend is working!");
});

// ✅ API: Fetch All Trades
app.get("/api/trades", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    const result = await pool.request().query("SELECT * FROM AllTradeRecords;");
    res.json({ trades: result.recordset });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch trades" });
  }
});

// ✅ API: Fetch Machines
app.get("/api/machines", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    const result = await pool.request().query("SELECT MachineId, Active FROM Machines;");
    res.json({ machines: result.recordset });
  } catch (error) {
    console.error("❌ Query Error (/api/machines):", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch machines" });
  }
});

// ✅ Binance Proxy Endpoint
const LOCAL_PROXY =
  process.env.NODE_ENV === 'production'
    ? 'https://lab-code-1.onrender.com/api/klines'
    : 'http://localhost:10000/api/klines';

app.get('/api/klines', async (req, res) => {
  try {
    const { symbol, interval, limit } = req.query;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 200}`;
    const { data } = await axios.get(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ✅ API: Fetch Signal Processing Logs with Pagination and Filtering
app.get("/api/SignalProcessingLogs", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause for filters
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    // Symbol filter
    if (req.query.symbol) {
      whereConditions.push(`symbol LIKE @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: `%${req.query.symbol}%` });
      paramIndex++;
    }
    // Signal type filter
    if (req.query.signalType) {
      whereConditions.push(`signal_type LIKE @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: `%${req.query.signalType}%` });
      paramIndex++;
    }
    // Machine filter
    if (req.query.machineId) {
      whereConditions.push(`machine_id = @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.machineId });
      paramIndex++;
    }
    // Date range filter
    if (req.query.fromDate) {
      whereConditions.push(`Candle_Time >= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.fromDate });
      paramIndex++;
    }
    if (req.query.toDate) {
      whereConditions.push(`Candle_Time <= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.toDate });
      paramIndex++;
    }
    // RSI range filter (from json_data, so not filterable in SQL directly)
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build the query
    const countQuery = `SELECT COUNT(*) as total FROM SignalProcessingLogs ${whereClause}`;
    const dataQuery = `
      SELECT 
        id,
        Candle_Time,
        symbol,
        interval,
        signal_type,
        signal_source,
        candle_pattern,
        price,
        squeeze_status,
        active_squeeze,
        processing_time_ms,
        machine_id,
        timestamp,
        json_data,
        created_at
      FROM SignalProcessingLogs 
      ${whereClause}
      ORDER BY Candle_Time DESC
      ${req.query.limit === 'all' ? '' : `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`}
    `;
    
    // Execute queries
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.value);
    });
    
    const [countResult, dataResult] = await Promise.all([
      request.query(countQuery),
      request.query(dataQuery)
    ]);
    
    const total = countResult.recordset[0].total;
    const logs = dataResult.recordset;
    
    // Parse JSON data for each log and extract extra fields
    const processedLogs = logs.map(log => {
      let extra = {};
      if (log.json_data) {
        try {
          const json = JSON.parse(log.json_data);
          extra = {
            rsi: json.rsi,
            macd: json.macd,
            trend: json.trend,
            action: json.action,
            status: json.status,
            // add more as needed
          };
        } catch (e) {}
      }
      return { ...log, ...extra };
    });
    
    res.json({
      logs: processedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error("❌ Query Error (/api/SignalProcessingLogs):", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch signal processing logs" });
  }
});

// ✅ API: Fetch Bot Event Logs with Pagination and Filtering
app.get("/api/bot-event-logs", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause for filters
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    // UID filter (exact match)
    if (req.query.uid) {
      whereConditions.push(`UID = @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.uid });
      paramIndex++;
    }
    
    // Source filter
    if (req.query.source) {
      whereConditions.push(`source LIKE @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: `%${req.query.source}%` });
      paramIndex++;
    }
    
    // Machine filter
    if (req.query.machineId) {
      whereConditions.push(`machine_id = @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.machineId });
      paramIndex++;
    }
    
    // Date range filter
    if (req.query.fromDate) {
      whereConditions.push(`timestamp >= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.fromDate });
      paramIndex++;
    }
    if (req.query.toDate) {
      whereConditions.push(`timestamp <= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.toDate });
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build the query
    const countQuery = `SELECT COUNT(*) as total FROM bot_event_log ${whereClause}`;
    const dataQuery = `
      SELECT 
        id,
        uid,
        source,
        Pl_after_comm,
        plain_message,
        json_message,
        timestamp,
        machine_id
      FROM bot_event_log 
      ${whereClause}
      ORDER BY timestamp DESC
      ${req.query.limit === 'all' ? '' : `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`}
    `;
    
    // Execute queries
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.value);
    });
    
    const [countResult, dataResult] = await Promise.all([
      request.query(countQuery),
      request.query(dataQuery)
    ]);
    
    const total = countResult.recordset[0].total;
    const logs = dataResult.recordset;
    
    // Parse JSON message for each log if needed
    const processedLogs = logs.map(log => {
      let parsedJson = null;
      if (log.json_message) {
        try {
          parsedJson = JSON.parse(log.json_message);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return { 
        ...log, 
        parsed_json_message: parsedJson 
      };
    });
    
    res.json({
      logs: processedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error("❌ Query Error (/api/bot-event-logs):", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch bot event logs" });
  }
});

// ✅ API: Get Log Summary Statistics
app.get("/api/SignalProcessingLogs/summary", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    
    // Build WHERE clause for filters (same as above)
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    if (req.query.symbol) {
      whereConditions.push(`symbol LIKE @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: `%${req.query.symbol}%` });
      paramIndex++;
    }
    if (req.query.signalType) {
      whereConditions.push(`signal_type LIKE @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: `%${req.query.signalType}%` });
      paramIndex++;
    }
    if (req.query.machineId) {
      whereConditions.push(`machine_id = @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.machineId });
      paramIndex++;
    }
    if (req.query.fromDate) {
      whereConditions.push(`Candle_Time >= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.fromDate });
      paramIndex++;
    }
    if (req.query.toDate) {
      whereConditions.push(`Candle_Time <= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.toDate });
      paramIndex++;
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get all logs for summary (for small/medium datasets; for large, optimize with SQL aggregation)
    const summaryQuery = `
      SELECT 
        signal_type,
        json_data
      FROM SignalProcessingLogs 
      ${whereClause}
    `;
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.value);
    });
    const result = await request.query(summaryQuery);
    const logs = result.recordset;
    let totalLogs = logs.length;
    let buyCount = 0;
    let sellCount = 0;
    let rsiSum = 0;
    let rsiCount = 0;
    let earliestLog = null;
    let latestLog = null;
    let uniqueSymbols = new Set();
    let uniqueMachines = new Set();
    logs.forEach(log => {
      if (log.signal_type === 'BUY') buyCount++;
      if (log.signal_type === 'SELL') sellCount++;
      if (log.json_data) {
        try {
          const json = JSON.parse(log.json_data);
          if (json.rsi !== undefined && json.rsi !== null) {
            rsiSum += Number(json.rsi);
            rsiCount++;
          }
        } catch (e) {}
      }
    });
    const avgRSI = rsiCount > 0 ? (rsiSum / rsiCount).toFixed(2) : null;
    res.json({
      summary: {
        totalLogs,
        buyCount,
        sellCount,
        avgRSI,
        uniqueSymbols: uniqueSymbols.size,
        uniqueMachines: uniqueMachines.size,
        earliestLog,
        latestLog
      }
    });
  } catch (error) {
    console.error("❌ Query Error (/api/SignalProcessingLogs/summary):", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch summary" });
  }
});

// ✅ API: Get Bot Event Log Summary Statistics
app.get("/api/bot-event-logs/summary", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    
    // Build WHERE clause for filters (same as above)
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    if (req.query.uid) {
      whereConditions.push(`UID = @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.uid });
      paramIndex++;
    }
    if (req.query.source) {
      whereConditions.push(`source LIKE @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: `%${req.query.source}%` });
      paramIndex++;
    }
    if (req.query.machineId) {
      whereConditions.push(`machine_id = @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.machineId });
      paramIndex++;
    }
    if (req.query.fromDate) {
      whereConditions.push(`timestamp >= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.fromDate });
      paramIndex++;
    }
    if (req.query.toDate) {
      whereConditions.push(`timestamp <= @p${paramIndex}`);
      params.push({ name: `p${paramIndex}`, value: req.query.toDate });
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalLogs,
        COUNT(DISTINCT machine_id) as uniqueMachines,
        COUNT(DISTINCT source) as uniqueSources,
        SUM(CASE WHEN Pl_after_comm > 0 THEN 1 ELSE 0 END) as positivePLCount,
        SUM(CASE WHEN Pl_after_comm < 0 THEN 1 ELSE 0 END) as negativePLCount,
        SUM(CASE WHEN Pl_after_comm = 0 THEN 1 ELSE 0 END) as zeroPLCount,
        AVG(Pl_after_comm) as avgPL,
        MIN(timestamp) as earliestLog,
        MAX(timestamp) as latestLog
      FROM bot_event_log 
      ${whereClause}
    `;
    
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.value);
    });
    
    const result = await request.query(summaryQuery);
    const summary = result.recordset[0];
    
    res.json({
      summary: {
        totalLogs: summary.totalLogs,
        uniqueMachines: summary.uniqueMachines,
        uniqueSources: summary.uniqueSources,
        positivePLCount: summary.positivePLCount,
        negativePLCount: summary.negativePLCount,
        zeroPLCount: summary.zeroPLCount,
        avgPL: summary.avgPL ? parseFloat(summary.avgPL).toFixed(2) : 0,
        earliestLog: summary.earliestLog,
        latestLog: summary.latestLog
      }
    });
  } catch (error) {
    console.error("❌ Query Error (/api/bot-event-logs/summary):", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch bot event log summary" });
  }
});

// ✅ API: Fetch Trades with Pair Filter
app.get("/api/trades/filtered", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    
    const { pair, limit = 1000 } = req.query;
    let query = "SELECT * FROM AllTradeRecords";
    let params = [];
    let paramIndex = 1;
    
    if (pair) {
      query += ` WHERE Pair = @p${paramIndex}`;
      params.push({ name: `p${paramIndex}`, value: pair });
      paramIndex++;
    }
    
    query += " ORDER BY created_at DESC";
    
    if (limit && limit !== 'all') {
      query += ` OFFSET 0 ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }
    
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.value);
    });
    
    const result = await request.query(query);
    console.log(`[Server] Fetched ${result.recordset.length} trades for pair: ${pair || 'all'}`);
    
    res.json({ trades: result.recordset });
  } catch (error) {
    console.error("❌ Query Error (/api/trades/filtered):", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch filtered trades" });
  }
});

// ✅ API: Fetch SignalProcessingLogs with Unique_id only (paginated)
app.get("/api/SignalProcessingLogsWithUniqueId", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");

    let { symbols, page = 1, limit = 100 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    if (!symbols) return res.status(400).json({ error: "Missing symbols param" });
    const symbolList = symbols.split(",").map(s => s.trim()).filter(Boolean);
    if (!symbolList.length) return res.status(400).json({ error: "No symbols provided" });

    // Build WHERE clause for symbols and Unique_id (SQL trims whitespace)
    const symbolPlaceholders = symbolList.map((_, i) => `@symbol${i}`).join(",");
    const whereClause = `symbol IN (${symbolList.map((_, i) => `@symbol${i}`).join(",")}) AND Unique_id IS NOT NULL AND LTRIM(RTRIM(Unique_id)) <> ''`;

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM SignalProcessingLogs WHERE ${whereClause}`;
    const countRequest = pool.request();
    symbolList.forEach((sym, i) => countRequest.input(`symbol${i}`, sym));
    // Debug log for count query
    console.log('[API DEBUG] Count Query:', countQuery);
    console.log('[API DEBUG] Count Params:', symbolList);
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch paginated logs
    const logsQuery = `SELECT * FROM SignalProcessingLogs WHERE ${whereClause} ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    const logsRequest = pool.request();
    symbolList.forEach((sym, i) => logsRequest.input(`symbol${i}`, sym));
    logsRequest.input("offset", offset);
    logsRequest.input("limit", limit);
    // Debug log for logs query
    console.log('[API DEBUG] Logs Query:', logsQuery);
    console.log('[API DEBUG] Logs Params:', symbolList, { offset, limit });
    const logsResult = await logsRequest.query(logsQuery);

    // Debug: log the first 10 Unique_id values from the raw result
    console.log('Raw Unique_id values:', logsResult.recordset.slice(0, 10).map((log, i) => `[${i}] '${log.Unique_id}'`));

    // Stronger filter: Unique_id must be a string, trimmed, not empty, not just whitespace or non-breaking spaces
    const filteredLogs = logsResult.recordset.filter(
      log => typeof log.Unique_id === 'string' && log.Unique_id.replace(/\s|\u00A0/g, '').length > 0
    );

    // Debug: log the first 10 Unique_id values after filtering
    console.log('Filtered Unique_id values:', filteredLogs.slice(0, 10).map((log, i) => `[${i}] '${log.Unique_id}'`));

    res.json({
      logs: filteredLogs,
      pagination: {
        total,
        totalPages,
        page,
        limit
      }
    });
  } catch (error) {
    console.error("❌ Query Error (/api/SignalProcessingLogsWithUniqueId):", error);
    res.status(500).json({ error: error.message || "Failed to fetch logs with Unique_id" });
  }
});

// ✅ API: Fetch SignalProcessingLogs by a list of UIDs
app.get("/api/SignalProcessingLogsByUIDs", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database not connected");
    let { uids } = req.query;
    if (!uids) return res.status(400).json({ error: "Missing uids param" });
    const uidList = uids.split(",").map(u => u.trim()).filter(Boolean);
    if (!uidList.length) return res.status(400).json({ error: "No UIDs provided" });

    const uidPlaceholders = uidList.map((_, i) => `@uid${i}`).join(",");
    const query = `SELECT * FROM SignalProcessingLogs WHERE Unique_id IN (${uidPlaceholders})`;
    const request = pool.request();
    uidList.forEach((uid, i) => request.input(`uid${i}`, uid));
    const result = await request.query(query);

    res.json({ logs: result.recordset });
  } catch (error) {
    console.error("❌ Query Error (/api/SignalProcessingLogsByUIDs):", error);
    res.status(500).json({ error: error.message || "Failed to fetch logs by UIDs" });
  }
});

// ✅ Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
const http = require("https");

// ✅ Self-Ping to Prevent Render Sleep (every 14 minutes)
setInterval(() => {
  
  http.get("https://lab-code-1.onrender.com/api/machines", (res) => {
    console.log(`📡 Self-ping status: ${res.statusCode}`);
  }).on("error", (err) => {
    console.error("❌ Self-ping failed:", err.message);
  });
}, 14 * 60 * 1000); // 14 minutes