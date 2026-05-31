/**
 * PulseOps Console - IT Operations Event Dashboard JS Controller
 * Tracks server incidents, hosts, severities (Critical, Major, Minor, Warning, Info),
 * dynamic logs terminal tails, and custom SVG resource telemetry charts.
 */

// --- INITIAL STATE & STORAGE CONFIG ---
const STORAGE_KEY = 'PULSE_OPS_PROTOTYPE_DATA_V3';
const API_BASE = 'http://localhost:8000/api';

// Fresh initial operations events if none found in Local Storage
const DEFAULT_EVENTS = [
  {
    id: 'EVT-2026-9041',
    severity: 'Critical',
    host: 'prod-api-shard-03.internal',
    summary: 'Out of Memory (OOM) killer terminated Node process (ID: 23908)',
    description: 'System memory utilization breached critical heap limit of 98%. Linux kernel invoked OOM-killer daemon, terminating primary node worker task. Auto-restart loop failing due to persistent memory exhaustion in cluster deployment.',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago
    status: 'Active',
    service: 'Checkout Billing API',
    threshold: 'system_memory_usage > 98%',
    chartPattern: 'leak',
    telemetryData: [
      { step: '-45m', value: 45 },
      { step: '-40m', value: 50 },
      { step: '-35m', value: 58 },
      { step: '-30m', value: 65 },
      { step: '-25m', value: 74 },
      { step: '-20m', value: 81 },
      { step: '-15m', value: 88 },
      { step: '-10m', value: 94 },
      { step: '-5m', value: 97 },
      { step: 'Trigger', value: 99 }
    ],
    historicalAlerts: [14, 25, 8, 3, 1], // Info, Warning, Minor, Major, Critical counts
    syslogs: [
      { level: 'info', msg: 'systemd[1]: Starting Node.js API Service worker-03...' },
      { level: 'info', msg: 'node[23908]: Bootstrapping application on port 8080. Cluster active.' },
      { level: 'info', msg: 'node[23908]: Heap allocations stabilized at 2.4GB.' },
      { level: 'warn', msg: 'node[23908]: [GC-Warning] Garbage Collection duration exceeded 1200ms.' },
      { level: 'warn', msg: 'node[23908]: High heap saturation: 89% capacity reached.' },
      { level: 'info', msg: 'kernel: [389104.912] rsyslogd: system limit threshold triggered: low memory pool' },
      { level: 'error', msg: 'kernel: [389108.109] Out of memory: Kill process 23908 (node) score 982 or sacrifice child' },
      { level: 'error', msg: 'systemd[1]: api-service-worker-03.service: Main process exited, code=killed, status=9/KILL' }
    ]
  },
  {
    id: 'EVT-2026-7844',
    severity: 'Major',
    host: 'rds-postgres-replica-01.db',
    summary: 'Active client pool exhaustion: database socket failures',
    description: 'PostgreSQL instance reached maximum allowed active client sockets (max_connections = 500). Subsequent connection attempts from web microservices are actively rejected with socket time-out exceptions.',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 mins ago
    status: 'Acknowledged',
    service: 'Customer Data Store',
    threshold: 'active_db_connections >= 500',
    chartPattern: 'spike',
    telemetryData: [
      { step: '-45m', value: 120 },
      { step: '-40m', value: 140 },
      { step: '-35m', value: 135 },
      { step: '-30m', value: 150 },
      { step: '-25m', value: 180 },
      { step: '-20m', value: 240 },
      { step: '-15m', value: 310 },
      { step: '-10m', value: 420 },
      { step: '-5m', value: 495 },
      { step: 'Trigger', value: 502 }
    ],
    historicalAlerts: [45, 12, 5, 15, 2],
    syslogs: [
      { level: 'info', msg: 'postgres[491]: database system is ready to accept connections on port 5432' },
      { level: 'info', msg: 'postgres[881]: checkpointer process started' },
      { level: 'info', msg: 'postgres[9902]: connection authorized: user=billing_app database=prod_checkout' },
      { level: 'warn', msg: 'postgres[10123]: warning: connection pool saturation reaching 90% (450/500)' },
      { level: 'warn', msg: 'postgres[10220]: connection limit warnings sent to ingress-gateway proxies' },
      { level: 'error', msg: 'postgres[10591]: FATAL: remaining connection slots are reserved for non-replication superuser connections' },
      { level: 'error', msg: 'postgres[10593]: FATAL: connection limit exceeded for database "prod_checkout"' },
      { level: 'warn', msg: 'consul-agent: health check failing for postgresql instance replica-01' }
    ]
  },
  {
    id: 'EVT-2026-6122',
    severity: 'Minor',
    host: 'k8s-ingress-gateway.cluster',
    summary: 'SSL / TLS Certificate expiring in 14 days',
    description: 'Let\'s Encrypt TLS certificate for domain wildcard *.pulseops.io will expire in exactly 14 days (June 13, 2026). ACME automated renewals are failing due to DNS validation timeout constraints.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hrs ago
    status: 'Active',
    service: 'User Routing Ingress',
    threshold: 'ssl_expiry_days <= 14',
    chartPattern: 'steady',
    telemetryData: [
      { step: '-45m', value: 14 },
      { step: '-40m', value: 14 },
      { step: '-35m', value: 14 },
      { step: '-30m', value: 14 },
      { step: '-25m', value: 14 },
      { step: '-20m', value: 14 },
      { step: '-15m', value: 14 },
      { step: '-10m', value: 14 },
      { step: '-5m', value: 14 },
      { step: 'Trigger', value: 14 }
    ],
    historicalAlerts: [80, 5, 2, 0, 0],
    syslogs: [
      { level: 'info', msg: 'ingress-controller: starting ACME challenge process for domain pulseops.io' },
      { level: 'info', msg: 'ingress-controller: dispatching DNS-01 verification records to Cloudflare DNS' },
      { level: 'warn', msg: 'ingress-controller: DNS propagation check timed out after 300 seconds' },
      { level: 'warn', msg: 'ingress-controller: retrying ACME challenge validation (attempt 2 of 3)...' },
      { level: 'warn', msg: 'ingress-controller: challenge response verification failure: 403 Forbidden' },
      { level: 'error', msg: 'ingress-controller: TLS Certificate for wildcard *.pulseops.io reaches critical expiry window (14 days left)' },
      { level: 'warn', msg: 'systemd[1]: ingress-gateway-cert-manager.service: Main process exited with code=1' }
    ]
  },
  {
    id: 'EVT-2026-4409',
    severity: 'Warning',
    host: 'elk-logging-node-02.internal',
    summary: 'Disk partition dev/xvda1 capacity at 89% (sector allocation stress)',
    description: 'Root disk partition dev/xvda1 volume size is approaching physical limits, currently occupied at 89%. Persistent log rotation script was skipped due to file descriptor locking by Elasticsearch index nodes.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hrs ago
    status: 'Resolved',
    service: 'Audit Log Archiver',
    threshold: 'disk_space_utilization >= 85%',
    chartPattern: 'normal',
    telemetryData: [
      { step: '-45m', value: 81 },
      { step: '-40m', value: 82 },
      { step: '-35m', value: 83 },
      { step: '-30m', value: 84 },
      { step: '-25m', value: 84 },
      { step: '-20m', value: 86 },
      { step: '-15m', value: 87 },
      { step: '-10m', value: 88 },
      { step: '-5m', value: 88 },
      { step: 'Trigger', value: 89 }
    ],
    historicalAlerts: [120, 48, 12, 1, 0],
    syslogs: [
      { level: 'info', msg: 'rsyslogd: log rotation daemon starting cron.daily task...' },
      { level: 'info', msg: 'rsyslogd: compressing logs in /var/log/nginx/access.log...' },
      { level: 'warn', msg: 'elasticsearch[112]: disk watermarks triggered: [low] disk utilization is at 85%' },
      { level: 'warn', msg: 'elasticsearch[112]: skipping log truncation - file descriptor locked by PID 1122' },
      { level: 'warn', msg: 'rsyslogd: write error: dev/xvda1 is nearing allocated blocks limit (89% full)' },
      { level: 'success', msg: 'systemd-logind: executing index compression and cleanups for Elasticsearch older indices' },
      { level: 'success', msg: 'system: disk reclaimed 18.2GB. Current dev/xvda1 load dropped to 72%. Alert Resolved.' }
    ]
  },
  {
    id: 'EVT-2026-3021',
    severity: 'Info',
    host: 'cron-backup-agent-01.infra',
    summary: 'Automated nightly database storage snapshot completed successfully',
    description: 'Scheduled backup agent successfully exported binary snapshots of all critical relational databases. Target checksums matched, and data packets were securely archived on AWS S3 storage with glacier lifecycle rule.',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hrs ago
    status: 'Resolved',
    service: 'Disaster Recovery Agent',
    threshold: 'cron_job_exit_code == 0',
    chartPattern: 'normal',
    telemetryData: [
      { step: '-45m', value: 2 },
      { step: '-40m', value: 4 },
      { step: '-35m', value: 8 },
      { step: '-30m', value: 12 },
      { step: '-25m', value: 92 }, // Peak during compression
      { step: '-20m', value: 95 },
      { step: '-15m', value: 45 },
      { step: '-10m', value: 15 },
      { step: '-5m', value: 4 },
      { step: 'Trigger', value: 0 }
    ],
    historicalAlerts: [450, 10, 0, 0, 0],
    syslogs: [
      { level: 'info', msg: 'cron[102]: starting task database-backup-nightly (PID 998)' },
      { level: 'info', msg: 'backup-agent: dumping postgresql schemas to local binary backup files...' },
      { level: 'info', msg: 'backup-agent: schema dump completed in 14.9 seconds. File size: 4.82GB' },
      { level: 'info', msg: 'backup-agent: compressing payload utilizing multi-thread GZIP...' },
      { level: 'info', msg: 'backup-agent: secure upload initialized to s3://pulseops-vault/backups/' },
      { level: 'info', msg: 'backup-agent: S3 transfer complete. MD5 checksum verified successfully.' },
      { level: 'success', msg: 'cron[102]: task completed successfully. Exit code: 0' }
    ]
  },
  {
    id: 'EVT-2026-1051',
    severity: 'Minor',
    host: 'prod-app-server-02.infra',
    summary: 'Disk partition root space capacity has reached 80%',
    description: 'Alert triggered on root partition /. Space capacity utilization breached Warning/Minor boundary threshold, currently occupied at 80% (160GB occupied of 200GB allocated volume size). Cluster scheduler recommends log compressions or cache sweeps.',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 mins ago
    status: 'Active',
    service: 'System Volume Monitor',
    threshold: 'disk_space_utilization >= 80%',
    chartPattern: 'leak',
    telemetryData: [
      { step: '-45m', value: 71 },
      { step: '-40m', value: 72 },
      { step: '-35m', value: 73 },
      { step: '-30m', value: 75 },
      { step: '-25m', value: 76 },
      { step: '-20m', value: 77 },
      { step: '-15m', value: 78 },
      { step: '-10m', value: 79 },
      { step: '-5m', value: 79 },
      { step: 'Trigger', value: 80 }
    ],
    historicalAlerts: [58, 24, 12, 1, 0],
    syslogs: [
      { level: 'info', msg: 'df-monitor: executing space diagnostic telemetry on volume mount /...' },
      { level: 'info', msg: 'df-monitor: dev/xvda2 allocated sector blocks: total 419430400, free 83886080' },
      { level: 'warn', msg: 'df-monitor: partition / has reached 80% disk capacity threshold limits' },
      { level: 'warn', msg: 'systemd: warning sent to alert-manager: disk volume space low' },
      { level: 'info', msg: 'logrotate: triggering automated cleanup routines for old journal logs...' },
      { level: 'success', msg: 'logrotate: reclaimed 850MB from systemd logs. Current capacity stabilized.' }
    ]
  },
  {
    id: 'EVT-2026-1052',
    severity: 'Minor',
    host: 'k8s-pod-worker-08.cluster',
    summary: 'Node execution CPU utilization has reached 75%',
    description: 'Kubernetes pod node CPU utilization reached the minor metric capacity threshold of 75% under concurrent API batch queues. Pod horizontal auto-scaler scheduler suggests launching extra routing instances.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    status: 'Active',
    service: 'Batch Process Scheduler',
    threshold: 'cpu_utilization >= 75%',
    chartPattern: 'spike',
    telemetryData: [
      { step: '-45m', value: 24 },
      { step: '-40m', value: 28 },
      { step: '-35m', value: 31 },
      { step: '-30m', value: 27 },
      { step: '-25m', value: 35 },
      { step: '-20m', value: 42 },
      { step: '-15m', value: 58 },
      { step: '-10m', value: 68 },
      { step: '-5m', value: 72 },
      { step: 'Trigger', value: 76 }
    ],
    historicalAlerts: [180, 54, 8, 3, 0],
    syslogs: [
      { level: 'info', msg: 'kubelet[12]: health monitoring reporting worker pod-08 cpu threads active' },
      { level: 'info', msg: 'kube-proxy: active sockets balancing loads across cluster proxies' },
      { level: 'warn', msg: 'kubelet[12]: cpu usage warning threshold breached: current core util 75%' },
      { level: 'warn', msg: 'hpa-controller: system utilization exceeds metrics-server target limits (70%)' },
      { level: 'info', msg: 'hpa-controller: dispatching scale request to replica controllers...' }
    ]
  },
  {
    id: 'EVT-2026-1053',
    severity: 'Minor',
    host: 'prod-db-postgres-02.internal',
    summary: 'Disk I/O bottleneck: thread wait-time blockages identified',
    description: 'Storage area disk channels reporting high queue blockages. The disk system I/O wait-time metrics exceeded the minor threshold (800ms) under heavy database index re-scanning, slowing connection cycles.',
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(), // ~1 hr ago
    status: 'Acknowledged',
    service: 'Transactional Database Engine',
    threshold: 'disk_io_wait_time >= 800ms',
    chartPattern: 'steady',
    telemetryData: [
      { step: '-45m', value: 780 },
      { step: '-40m', value: 795 },
      { step: '-35m', value: 810 },
      { step: '-30m', value: 805 },
      { step: '-25m', value: 815 },
      { step: '-20m', value: 820 },
      { step: '-15m', value: 830 },
      { step: '-10m', value: 845 },
      { step: '-5m', value: 835 },
      { step: 'Trigger', value: 840 }
    ],
    historicalAlerts: [35, 12, 4, 8, 1],
    syslogs: [
      { level: 'info', msg: 'postgres[991]: backend executing VACUUM ANALYZE tasks on table transactions' },
      { level: 'warn', msg: 'kernel: [8940.109] iostat warning: disk block queue waiting times exceed 800ms' },
      { level: 'warn', msg: 'postgres[991]: query sequential scan blocked waiting on block device lock' },
      { level: 'info', msg: 'syslog: connection pipeline latency monitoring warning sent to alerts server' }
    ]
  },
  {
    id: 'EVT-2026-1054',
    severity: 'Minor',
    host: 'san-controller-storage-01.infra',
    summary: 'Storage subsystem reports high latency: read/write latency > 50ms',
    description: 'Shared Storage Area Network (SAN) controller block storage arrays experiencing sector lags. Combined read/write volume request transaction times breached target threshold limit of 50ms (average latency: 68.2ms).',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // 3 hrs ago
    status: 'Active',
    service: 'SAN Block Storage Node',
    threshold: 'storage_disk_latency > 50ms',
    chartPattern: 'spike',
    telemetryData: [
      { step: '-45m', value: 12 },
      { step: '-40m', value: 14 },
      { step: '-35m', value: 18 },
      { step: '-30m', value: 20 },
      { step: '-25m', value: 16 },
      { step: '-20m', value: 24 },
      { step: '-15m', value: 48 },
      { step: '-10m', value: 58 },
      { step: '-5m', value: 65 },
      { step: 'Trigger', value: 68 }
    ],
    historicalAlerts: [88, 14, 5, 2, 0],
    syslogs: [
      { level: 'info', msg: 'san-agent: heartbeat verified with fibre channel switch nodes' },
      { level: 'warn', msg: 'san-agent: disk block read time latency warning threshold limit exceeded (68.2ms > 50ms)' },
      { level: 'warn', msg: 'san-agent: raid controller storage reconstruction queue queue queue lag identified' },
      { level: 'info', msg: 'syslog: diagnostic metrics payload forwarded to telemetry control center' }
    ]
  },
  {
    id: 'EVT-2026-1055',
    severity: 'Minor',
    host: 'analytics-logstash-01.internal',
    summary: 'Storage subsystem warning: transaction write latency > 50ms',
    description: 'Logstash bulk event forwarder block-device queue reporting transactional read/write block operations lagging over 50ms under peak batch analytics cycles. Disk writes resolved upon logs sweep.',
    timestamp: new Date(Date.now() - 480 * 60 * 1000).toISOString(), // 8 hrs ago
    status: 'Resolved',
    service: 'Data Logging Pipeline',
    threshold: 'write_latency > 50ms',
    chartPattern: 'normal',
    telemetryData: [
      { step: '-45m', value: 8 },
      { step: '-40m', value: 12 },
      { step: '-35m', value: 15 },
      { step: '-30m', value: 52 },
      { step: '-25m', value: 54 },
      { step: '-20m', value: 42 },
      { step: '-15m', value: 22 },
      { step: '-10m', value: 12 },
      { step: '-5m', value: 6 },
      { step: 'Trigger', value: 4 }
    ],
    historicalAlerts: [220, 15, 2, 0, 0],
    syslogs: [
      { level: 'info', msg: 'logstash[88]: bulk ingest indexing batch #998 started...' },
      { level: 'warn', msg: 'logstash[88]: transactional disk output write queue lag threshold breached (>50ms)' },
      { level: 'info', msg: 'logstash[88]: batch buffer storage cleared, shifting indexes to archive node' },
      { level: 'success', msg: 'logstash[88]: bulk disk output write latencies recovered to normal limits (4ms). Resolved.' }
    ]
  }
];

// --- CORE TELEMETRY STATE ---
const state = {
  events: [],
  useAPI: false,
  activeSeverity: 'All',
  activeLifecycle: 'all', // 'all', 'active', 'acknowledged', 'resolved'
  searchQuery: '',
  selectedEventId: null,
  severitySort: 'none' // 'none', 'desc', 'asc'
};
window.state = state;

// --- ELEMENT SELECTORS ---
const dom = {
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  simulateAlertBtn: document.getElementById('simulate-alert-btn'),
  
  // Dashboard Metrics Indicators
  statActiveAlerts: document.getElementById('stat-active-alerts'),
  statCriticalCount: document.getElementById('stat-critical-count'),
  statMtta: document.getElementById('stat-mtta'),
  statSystemHealth: document.getElementById('stat-system-health'),
  
  // Filters Panel
  searchInput: document.getElementById('search-input'),
  severityFilterList: document.getElementById('severity-filter-list'),
  statusFilterList: document.getElementById('status-filter-list'),
  
  // Grid Table & Main
  incidentsTableBody: document.getElementById('incidents-table-body'),
  emptyStatePanel: document.getElementById('empty-state-panel'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  displayedEventsCount: document.getElementById('displayed-events-count'),
  totalEventsCount: document.getElementById('total-events-count'),
  statusLifecycleTabs: document.getElementById('status-lifecycle-tabs'),
  thSeverity: document.getElementById('th-severity'),
  severitySortIcon: document.getElementById('severity-sort-icon'),
  
  // Simulate Modal elements
  simulateModal: document.getElementById('simulate-alert-modal'),
  closeSimulateModal: document.getElementById('close-simulate-modal'),
  cancelSimulateBtn: document.getElementById('cancel-simulate-btn'),
  simulateAlertForm: document.getElementById('simulate-alert-form'),
  
  // Slideover Detail elements
  detailSlideoverOverlay: document.getElementById('detail-slideover-overlay'),
  detailSlideoverPanel: document.getElementById('detail-slideover-panel'),
  closeDetailBtn: document.getElementById('close-detail-btn'),
  detailEventId: document.getElementById('detail-event-id'),
  detailSeverityContainer: document.getElementById('detail-severity-container'),
  detailTitle: document.getElementById('detail-title'),
  detailHost: document.getElementById('detail-host'),
  detailThreshold: document.getElementById('detail-threshold'),
  detailService: document.getElementById('detail-service'),
  detailDescription: document.getElementById('detail-description'),
  detailLogTerminal: document.getElementById('detail-log-terminal'),
  detailStatusBadge: document.getElementById('detail-status-badge'),
  rsvpActionBtn: document.getElementById('rsvp-action-btn'),
  resolveActionBtn: document.getElementById('resolve-action-btn'),
  
  // OpsCopilot Chat
  chatHistoryLog: document.getElementById('chat-history-log'),
  chatSuggestedPrompts: document.getElementById('chat-suggested-prompts'),
  chatInputForm: document.getElementById('chat-input-form'),
  chatTextInput: document.getElementById('chat-text-input'),
  
  // Analytics
  chartLoadMetric: document.getElementById('chart-load-metric'),
  chartHistoryMetric: document.getElementById('chart-history-metric'),
  lineChartWrapper: document.getElementById('line-chart-wrapper'),
  barChartWrapper: document.getElementById('bar-chart-wrapper'),
  
  // Notification Toast container
  toastContainer: document.getElementById('toast-container')
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  loadThemeSettings();
  await loadData();
  setupEventListeners();
  renderApp();
});

// --- DATA PERSISTENCE ---
async function loadData() {
  try {
    // Attempt to connect to Python FastAPI backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
    
    const res = await fetch(`${API_BASE}/events`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      state.useAPI = true;
      state.events = await res.json();
      console.log("PulseOps: Successfully connected to active Python FastAPI Telemetry Backend!");
      return;
    }
  } catch (e) {
    console.warn("PulseOps: FastAPI server offline. Falling back to local storage.");
  }
  
  // Graceful fallback to Local Storage
  state.useAPI = false;
  loadLocalStorageFallback();
}

// --- CLIENT-SIDE ML TELEMETRY FORECASTING & ANOMALY ENGINE ---
function predictAnomalyAndForecastJS(telemetryData, chartPattern, status, threshold) {
  let values = [];
  let steps = [];
  if (telemetryData && telemetryData.length > 0) {
    telemetryData.forEach(item => {
      values.push(parseFloat(item.value));
      steps.push(String(item.step));
    });
  } else {
    values = [10.0, 12.0, 15.0, 18.0, 16.0, 20.0];
    steps = ["-25m", "-20m", "-15m", "-10m", "-5m", "Trigger"];
  }

  const lastVal = values[values.length - 1];
  let maxCap = 100.0;
  if (threshold.includes("db_connections")) {
    maxCap = 600.0;
  } else if (threshold.includes("ssl_expiry")) {
    maxCap = 100.0;
  }

  // Linear Regression / Autoregressive trend fit on recent points (last 4 steps)
  const recentY = values.slice(-4);
  const n = recentY.length;
  let slope = 0.0;
  if (n > 1) {
    const recentX = Array.from({length: n}, (_, i) => i);
    const meanX = recentX.reduce((a, b) => a + b, 0) / n;
    const meanY = recentY.reduce((a, b) => a + b, 0) / n;

    let num = 0.0;
    let den = 0.0;
    for (let i = 0; i < n; i++) {
      num += (recentX[i] - meanX) * (recentY[i] - meanY);
      den += Math.pow(recentX[i] - meanX, 2);
    }
    slope = den !== 0 ? num / den : 0.0;
  }

  // Project 5 future forecast steps (+5m, +10m, +15m, +20m, +25m)
  const forecastSteps = ["+5m", "+10m", "+15m", "+20m", "+25m"];
  const forecastData = [];
  forecastSteps.forEach((stepName, i) => {
    let projected = lastVal + (slope * (i + 1));
    if (threshold.includes("ssl_expiry")) {
      projected = Math.max(0.0, projected);
    } else {
      projected = Math.max(0.0, Math.min(maxCap, projected));
    }
    forecastData.push({ step: stepName, value: Math.round(projected * 10) / 10 });
  });

  // Statistical Anomaly scoring using z-scores
  const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  let anomalyProb = 0.0;
  if (status === "Resolved") {
    if (threshold.includes("ssl_expiry")) {
      anomalyProb = 12.5;
    } else {
      anomalyProb = Math.round((2.0 + (lastVal % 4.0)) * 10) / 10;
    }
  } else {
    let zScore = stdDev > 0 ? Math.abs(lastVal - meanVal) / stdDev : 1.0;
    let baseProb = 55 + (zScore * 12);
    if (lastVal >= maxCap * 0.9) {
      baseProb += 15;
    }
    anomalyProb = Math.max(40, Math.min(99, baseProb));
  }
  anomalyProb = Math.round(anomalyProb * 10) / 10;

  // Classify pattern
  let classification = "";
  let explanation = "";
  if (status === "Resolved") {
    classification = "Normal Telemetry";
    explanation = "Resource usage has fully stabilized. System reports normal variance.";
  } else if (slope > 1.2 && lastVal > maxCap * 0.75) {
    classification = "System Resource Leak (OOM)";
    explanation = `Telemetry displays a persistent upward drift slope of +${slope.toFixed(2)}/min, signaling memory/resource leakage.`;
  } else if (Math.abs(slope) < 0.5 && lastVal > maxCap * 0.85) {
    classification = "Sustained High Stress";
    explanation = `Host has plateaued at high capacity utilization (average: ${meanVal.toFixed(1)}%) with severe thread blocks.`;
  } else if (slope > 4.5) {
    classification = "Sudden Transient Spike";
    explanation = `Rapid operational jump detected (slope velocity +${slope.toFixed(2)}/step). Typical of massive queue surges or core loops.`;
  } else if (stdDev > 15.0) {
    classification = "Erratic Oscillations";
    explanation = `Highly erratic wave behavior detected (standard deviation: ${stdDev.toFixed(2)}). Signals load-balancer imbalance.`;
  } else {
    classification = "Threshold Breach";
    explanation = `Gradual boundary threshold exceeded limit limits. Slope trend remains positive (+${slope.toFixed(2)}/step).`;
  }

  return {
    confidenceScore: anomalyProb,
    classification: classification,
    explanation: explanation,
    forecastData: forecastData,
    slope: Math.round(slope * 1000) / 1000,
    stdDev: Math.round(stdDev * 100) / 100
  };
}

function loadLocalStorageFallback() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      state.events = JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing stored telemetry events, resetting to defaults.', e);
      state.events = [...DEFAULT_EVENTS];
    }
  } else {
    state.events = [...DEFAULT_EVENTS];
    saveToStorage();
  }
}

function saveToStorage() {
  if (state.useAPI) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
}

// --- THEME MANAGEMENT ---
function loadThemeSettings() {
  const darkThemeOff = localStorage.getItem('theme-light') === 'true';
  if (darkThemeOff) {
    document.body.classList.add('light-theme');
    updateThemeIcon(false);
  } else {
    document.body.classList.remove('light-theme');
    updateThemeIcon(true);
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme-light', isLight);
  updateThemeIcon(!isLight);
  showToast(isLight ? 'Light Theme activated.' : 'Dark Telemetry room theme restored.');
}

function updateThemeIcon(isDark) {
  if (!dom.themeToggleBtn) return;
  dom.themeToggleBtn.innerHTML = isDark 
    ? `<i data-lucide="sun"></i>` 
    : `<i data-lucide="moon"></i>`;
  if (window.lucide) window.lucide.createIcons();
}

// --- EVENT LISTENERS CONFIG ---
function setupEventListeners() {
  // Theme Toggle
  dom.themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Instant Search
  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderIncidentsTable();
  });

  // Severity sorting header click
  if (dom.thSeverity) {
    dom.thSeverity.addEventListener('click', () => {
      if (state.severitySort === 'none') {
        state.severitySort = 'desc';
      } else if (state.severitySort === 'desc') {
        state.severitySort = 'asc';
      } else {
        state.severitySort = 'none';
      }
      updateSeveritySortHeaderUI();
      renderIncidentsTable();
    });
  }

  // Diagnostics filters in sidebar (All, Unresolved, Resolved)
  const statusDiagnosticPills = dom.statusFilterList.querySelectorAll('[data-status]');
  statusDiagnosticPills.forEach(btn => {
    btn.addEventListener('click', () => {
      statusDiagnosticPills.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      
      const val = btn.dataset.status;
      if (val === 'all') {
        state.activeLifecycle = 'all';
      } else if (val === 'unresolved') {
        state.activeLifecycle = 'unresolved';
      } else if (val === 'resolved') {
        state.activeLifecycle = 'resolved';
      }
      
      // Update Lifecycle Status tab active class to mirror
      const tabs = dom.statusLifecycleTabs.querySelectorAll('[data-lifecycle]');
      tabs.forEach(t => {
        if (t.dataset.lifecycle === val) t.classList.add('active');
        else t.classList.remove('active');
      });

      renderIncidentsTable();
    });
  });

  // Lifecycle Tabs (All, Active, Acknowledged, Resolved)
  const lifecycleTabs = dom.statusLifecycleTabs.querySelectorAll('[data-lifecycle]');
  lifecycleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      lifecycleTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeLifecycle = tab.dataset.lifecycle;
      
      // Update Sidebar diagnostics active state to mirror
      const pills = dom.statusFilterList.querySelectorAll('[data-status]');
      pills.forEach(p => {
        const sideVal = p.dataset.status;
        if (state.activeLifecycle === 'all' && sideVal === 'all') p.classList.add('active');
        else if ((state.activeLifecycle === 'active' || state.activeLifecycle === 'acknowledged' || state.activeLifecycle === 'unresolved') && sideVal === 'unresolved') p.classList.add('active');
        else if (state.activeLifecycle === 'resolved' && sideVal === 'resolved') p.classList.add('active');
        else p.classList.remove('active');
      });

      renderIncidentsTable();
    });
  });

  // Clear Filters
  dom.resetFiltersBtn.addEventListener('click', clearAllFilters);

  // Alert simulator modal triggers if elements exist
  if (dom.simulateAlertBtn) {
    dom.simulateAlertBtn.addEventListener('click', () => {
      dom.simulateModal.classList.add('active');
    });
  }

  if (dom.closeSimulateModal) {
    dom.closeSimulateModal.addEventListener('click', () => dom.simulateModal.classList.remove('active'));
  }
  if (dom.cancelSimulateBtn) {
    dom.cancelSimulateBtn.addEventListener('click', () => dom.simulateModal.classList.remove('active'));
  }
  if (dom.simulateModal) {
    dom.simulateModal.addEventListener('click', (e) => {
      if (e.target === dom.simulateModal) dom.simulateModal.classList.remove('active');
    });
  }

  // Submit Simulated Alert
  if (dom.simulateAlertForm) {
    dom.simulateAlertForm.addEventListener('submit', handleSimulatedAlertSubmit);
  }

  // Slide-over close details triggers
  dom.closeDetailBtn.addEventListener('click', closeDetailSlideover);
  dom.detailSlideoverOverlay.addEventListener('click', closeDetailSlideover);

  // Incident Slide-over Actions
  dom.rsvpActionBtn.addEventListener('click', handleAcknowledgeAlertClick);
  dom.resolveActionBtn.addEventListener('click', handleResolveAlertClick);
  
  // OpsCopilot Chat submit listener
  dom.chatInputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleChatSubmit();
  });

}

// --- RENDER ALL APP PANELS ---
function renderApp() {
  renderMetricsPanel();
  renderSeverityFilterPanel();
  renderIncidentsTable();
}

// --- RENDER GLOBAL TELEMETRY METRICS ---
function renderMetricsPanel() {
  const events = state.events;
  
  // Unresolved counts
  const unresolvedAlerts = events.filter(e => e.status !== 'Resolved').length;
  dom.statActiveAlerts.innerText = unresolvedAlerts;

  // Critical counts
  const criticalOutages = events.filter(e => e.severity === 'Critical' && e.status !== 'Resolved').length;
  dom.statCriticalCount.innerText = criticalOutages;

  // Calculated simulated MTTA
  const ackedCount = events.filter(e => e.status === 'Acknowledged' || e.status === 'Resolved').length;
  const mtSeconds = ackedCount > 0 ? (ackedCount * 12 + 8) : 0;
  dom.statMtta.innerText = mtSeconds > 0 ? `${mtSeconds}m` : '0m';

  // Health index calculated: starting at 100%, subtract 15% for Critical unresolved, 6% for Major, 2% for Warning
  let health = 100;
  events.forEach(e => {
    if (e.status !== 'Resolved') {
      if (e.severity === 'Critical') health -= 15;
      else if (e.severity === 'Major') health -= 6;
      else if (e.severity === 'Minor') health -= 3;
      else if (e.severity === 'Warning') health -= 1;
    }
  });
  
  health = Math.max(20, Math.min(100, health));
  dom.statSystemHealth.innerText = `${health}%`;
}

// --- RENDER SEVERITY LIST FILTERS ---
function renderSeverityFilterPanel() {
  const severities = ['All', 'Critical', 'Major', 'Minor', 'Warning', 'Info'];
  
  dom.severityFilterList.innerHTML = '';
  
  severities.forEach(sev => {
    // Count how many events fall into this severity level
    const count = sev === 'All' 
      ? state.events.length 
      : state.events.filter(e => e.severity === sev).length;
      
    const pill = document.createElement('button');
    pill.className = `category-pill ${state.activeSeverity === sev ? 'active' : ''}`;
    pill.innerHTML = `
      <span>${sev}</span>
      <span class="category-count">${count}</span>
    `;
    
    pill.addEventListener('click', () => {
      state.activeSeverity = sev;
      
      const pills = dom.severityFilterList.querySelectorAll('.category-pill');
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      renderIncidentsTable();
    });
    
    dom.severityFilterList.appendChild(pill);
  });

  // Diagnostic timeframe totals in sidebar
  const total = state.events.length;
  const unresolved = state.events.filter(e => e.status !== 'Resolved').length;
  const resolved = state.events.filter(e => e.status === 'Resolved').length;

  document.getElementById('count-all').innerText = total;
  document.getElementById('count-unresolved').innerText = unresolved;
  document.getElementById('count-resolved').innerText = resolved;
}

// --- RENDER DENSE LOG TABLE ---
function renderIncidentsTable() {
  const filtered = state.events.filter(evt => {
    // 1. Severity filter check
    const matchesSeverity = state.activeSeverity === 'All' || evt.severity === state.activeSeverity;

    // 2. Lifecycle Status check
    let matchesStatus = true;
    if (state.activeLifecycle === 'active') {
      matchesStatus = evt.status === 'Active';
    } else if (state.activeLifecycle === 'acknowledged') {
      matchesStatus = evt.status === 'Acknowledged';
    } else if (state.activeLifecycle === 'resolved') {
      matchesStatus = evt.status === 'Resolved';
    } else if (state.activeLifecycle === 'unresolved') {
      matchesStatus = evt.status !== 'Resolved';
    }

    // 3. Query string match
    const query = state.searchQuery.toLowerCase().trim();
    const matchesSearch = query === '' ||
      evt.id.toLowerCase().includes(query) ||
      evt.host.toLowerCase().includes(query) ||
      evt.summary.toLowerCase().includes(query) ||
      evt.service.toLowerCase().includes(query) ||
      evt.severity.toLowerCase().includes(query);

    return matchesSeverity && matchesStatus && matchesSearch;
  });

  // Apply severity based sorting if active
  if (state.severitySort !== 'none') {
    const severityPriority = {
      'Critical': 5,
      'Major': 4,
      'Minor': 3,
      'Warning': 2,
      'Info': 1
    };
    filtered.sort((a, b) => {
      const pA = severityPriority[a.severity] || 0;
      const pB = severityPriority[b.severity] || 0;
      return state.severitySort === 'desc' ? (pB - pA) : (pA - pB);
    });
  }

  // Dynamic counter display
  dom.displayedEventsCount.innerText = filtered.length;
  dom.totalEventsCount.innerText = state.events.length;

  dom.incidentsTableBody.innerHTML = '';

  if (filtered.length === 0) {
    dom.emptyStatePanel.style.display = 'flex';
    return;
  }
  dom.emptyStatePanel.style.display = 'none';

  // Render Table rows
  filtered.forEach(evt => {
    // Format timestamp
    const timeText = formatRelativeTime(evt.timestamp);
    
    const row = document.createElement('tr');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Incident ${evt.id}, Severity ${evt.severity}, Host ${evt.host}`);
    
    row.innerHTML = `
      <td class="cell-id">${evt.id}</td>
      <td>
        <span class="severity-badge ${evt.severity.toLowerCase()}">
          <span style="display:inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
          ${evt.severity}
        </span>
      </td>
      <td class="cell-host">${evt.host}</td>
      <td class="cell-summary">${evt.summary}</td>
      <td class="cell-time">${timeText}</td>
      <td>
        <span class="status-pill ${evt.status.toLowerCase()}">${evt.status}</span>
      </td>
    `;

    // Row Click events
    row.addEventListener('click', () => openDetailSlideover(evt.id));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openDetailSlideover(evt.id);
    });

    dom.incidentsTableBody.appendChild(row);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- CLEAR ALL ACTIVE FILTERS ---
function clearAllFilters() {
  state.searchQuery = '';
  state.activeSeverity = 'All';
  state.activeLifecycle = 'all';
  state.severitySort = 'none';
  updateSeveritySortHeaderUI();
  
  dom.searchInput.value = '';

  // Reset side severity active state
  const pills = dom.severityFilterList.querySelectorAll('.category-pill');
  pills.forEach(p => {
    if (p.textContent.includes('All')) p.classList.add('active');
    else p.classList.remove('active');
  });

  // Reset side status active state
  const sidePills = dom.statusFilterList.querySelectorAll('[data-status]');
  sidePills.forEach(p => {
    if (p.dataset.status === 'all') p.classList.add('active');
    else p.classList.remove('active');
  });

  // Reset top tab active state
  const tabs = dom.statusLifecycleTabs.querySelectorAll('[data-lifecycle]');
  tabs.forEach(t => {
    if (t.dataset.lifecycle === 'all') t.classList.add('active');
    else t.classList.remove('active');
  });

  renderIncidentsTable();
  showToast('Operational filters reset successfully.');
}
window.clearAllFilters = clearAllFilters;

function updateSeveritySortHeaderUI() {
  if (!dom.severitySortIcon) return;
  if (state.severitySort === 'desc') {
    dom.severitySortIcon.innerHTML = `<i data-lucide="chevron-down" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-left: 4px;"></i>`;
  } else if (state.severitySort === 'asc') {
    dom.severitySortIcon.innerHTML = `<i data-lucide="chevron-up" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-left: 4px;"></i>`;
  } else {
    dom.severitySortIcon.innerHTML = '';
  }
  if (window.lucide) window.lucide.createIcons();
}

// --- SIMULATED ALERT INJECTOR HANDLER ---
function handleSimulatedAlertSubmit(e) {
  e.preventDefault();
  
  const severity = document.getElementById('form-severity').value;
  const host = document.getElementById('form-host').value;
  const summary = document.getElementById('form-summary').value;
  const description = document.getElementById('form-desc').value;
  const service = document.getElementById('form-service').value;
  const threshold = document.getElementById('form-threshold').value;
  const pattern = document.getElementById('form-chart-pattern').value;

  if (state.useAPI) {
    handleSimulatedAlertAPISubmit(severity, host, summary, description, service, threshold, pattern);
    return;
  }
  
  // Format dynamic EVT ID
  const randNum = Math.floor(Math.random() * 9000) + 1000;
  const newEventId = `EVT-2026-${randNum}`;

  // Build simulated resource timelines
  let telemetry = [];
  if (pattern === 'spike') {
    telemetry = [
      { step: '-45m', value: 10 }, { step: '-40m', value: 12 }, { step: '-35m', value: 15 },
      { step: '-30m', value: 18 }, { step: '-25m', value: 14 }, { step: '-20m', value: 16 },
      { step: '-15m', value: 92 }, { step: '-10m', value: 94 }, { step: '-5m', value: 96 },
      { step: 'Trigger', value: 99 }
    ];
  } else if (pattern === 'leak') {
    telemetry = [
      { step: '-45m', value: 20 }, { step: '-40m', value: 30 }, { step: '-35m', value: 40 },
      { step: '-30m', value: 50 }, { step: '-25m', value: 60 }, { step: '-20m', value: 70 },
      { step: '-15m', value: 80 }, { step: '-10m', value: 85 }, { step: '-5m', value: 91 },
      { step: 'Trigger', value: 97 }
    ];
  } else if (pattern === 'steady') {
    telemetry = [
      { step: '-45m', value: 85 }, { step: '-40m', value: 87 }, { step: '-35m', value: 86 },
      { step: '-30m', value: 88 }, { step: '-25m', value: 87 }, { step: '-20m', value: 88 },
      { step: '-15m', value: 89 }, { step: '-10m', value: 90 }, { step: '-5m', value: 91 },
      { step: 'Trigger', value: 93 }
    ];
  } else {
    telemetry = [
      { step: '-45m', value: 15 }, { step: '-40m', value: 22 }, { step: '-35m', value: 18 },
      { step: '-30m', value: 25 }, { step: '-25m', value: 30 }, { step: '-20m', value: 24 },
      { step: '-15m', value: 28 }, { step: '-10m', value: 32 }, { step: '-5m', value: 35 },
      { step: 'Trigger', value: 40 }
    ];
  }

  // Create simulated terminal logs tail
  const dateStr = new Date().toISOString().split('T')[1].substring(0, 8);
  const syslogs = [
    { level: 'info', msg: `systemd[1]: Initializing metrics logging daemon daemon on ${host}...` },
    { level: 'info', msg: `daemon[2349]: target parameter set: ${threshold}` },
    { level: 'warn', msg: `daemon[2349]: [TelemetryWarning] metric surge identified in target partition: ${service}` },
    { level: 'warn', msg: `daemon[2349]: telemetry timeline is reporting ${pattern} pattern constraints` },
    { level: 'error', msg: `daemon[2349]: [CRITICAL] System alert triggered: threshold exceeded limit (${threshold})` },
    { level: 'error', msg: `syslog: [${dateStr}] operational alert dispatched to Control Room center: ID ${newEventId}` }
  ];

  const newEvent = {
    id: newEventId,
    severity,
    host,
    summary,
    description,
    timestamp: new Date().toISOString(),
    status: 'Active',
    service,
    threshold,
    chartPattern: pattern,
    telemetryData: telemetry,
    historicalAlerts: [
      Math.floor(Math.random() * 50) + 10,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 10) + 1,
      Math.floor(Math.random() * 5),
      severity === 'Critical' ? 1 : 0
    ],
    syslogs
  };

  // Insert to events state list
  state.events.unshift(newEvent);
  saveToStorage();
  renderApp();

  // Hide modal
  dom.simulateModal.classList.remove('active');
  dom.simulateAlertForm.reset();

  showToast(`Simulated Alert Incident ${newEventId} injected on Host ${host}!`, severity === 'Critical');
}

// --- OPEN ALERT SLIDE-OVER DETAIL SUMMARY ---
async function openDetailSlideover(eventId) {
  let evt = state.events.find(e => e.id === eventId);
  if (!evt) return;

  state.selectedEventId = eventId;

  // If using FastAPI backend, fetch the latest dynamic detail with on-the-fly ML diagnostics
  if (state.useAPI) {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}`);
      if (res.ok) {
        const fullEvt = await res.json();
        // Update local events state cache
        const idx = state.events.findIndex(e => e.id === eventId);
        if (idx !== -1) {
          state.events[idx] = fullEvt;
        }
        evt = fullEvt;
      }
    } catch (err) {
      console.warn("PulseOps: Failed to fetch active ML diagnostics from API, falling back to local simulation.", err);
    }
  }

  // Ensure ML diagnostics are computed (fallback to client-side JS linear-trend/z-score ML model)
  if (!evt.mlDiagnostics) {
    evt.mlDiagnostics = predictAnomalyAndForecastJS(evt.telemetryData, evt.chartPattern, evt.status, evt.threshold);
  }

  // Map slide-over static text
  dom.detailEventId.innerText = evt.id;
  dom.detailTitle.innerText = evt.summary;
  dom.detailHost.innerText = evt.host;
  dom.detailThreshold.innerText = evt.threshold;
  dom.detailService.innerText = evt.service;
  dom.detailDescription.innerText = evt.description;

  // Severity badge dynamic injection
  dom.detailSeverityContainer.innerHTML = `
    <span class="severity-badge ${evt.severity.toLowerCase()}">
      <span style="display:inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
      ${evt.severity}
    </span>
  `;

  // Render the circular ML Anomaly Probability Dial/Gauge and the ML Diagnostics Card
  const mlContainer = document.getElementById('detail-ml-diagnostics-container');
  if (mlContainer) {
    if (evt.mlDiagnostics) {
      const conf = evt.mlDiagnostics.confidenceScore;
      
      // Determine dial color class based on confidence level
      let colorClass = 'green';
      if (conf >= 85) {
        colorClass = 'red';
      } else if (conf >= 70) {
        colorClass = 'orange';
      } else if (conf >= 40) {
        colorClass = 'yellow';
      }
      
      // SVG Circle Math for Gauge: r=32, circumference = 2 * PI * r = 201
      const radius = 32;
      const circumference = 2 * Math.PI * radius; // ~201.06
      const offset = circumference - (conf / 100) * circumference;

      mlContainer.style.display = 'block';
      mlContainer.innerHTML = `
        <div class="ml-diagnostics-card">
          <div class="ml-diagnostics-gauge-container">
            <svg class="ml-diagnostics-gauge-svg" viewBox="0 0 76 76">
              <circle class="ml-gauge-track" cx="38" cy="38" r="${radius}"></circle>
              <circle class="ml-gauge-value ${colorClass}" cx="38" cy="38" r="${radius}" 
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};">
              </circle>
            </svg>
            <div class="ml-gauge-text">${conf}%</div>
          </div>
          <div class="ml-diagnostics-body">
            <div class="ml-badge-tag">
              <i data-lucide="brain-circuit" style="width: 10px; height: 10px;"></i>
              ML Auto-Diagnosed
            </div>
            <div class="ml-diagnostics-title">${evt.mlDiagnostics.classification}</div>
            <div class="ml-diagnostics-desc">${evt.mlDiagnostics.explanation}</div>
          </div>
        </div>
      `;
    } else {
      mlContainer.style.display = 'none';
      mlContainer.innerHTML = '';
    }
  }

  // Status controls rendering
  updateStatusControlsUI(evt);

  // Render simulated terminal logs tail
  renderLogTerminalTail(evt.syslogs);

  // Render customized telemetry analytics timeline graphs
  renderAnalyticsTimeline(evt);

  // Initialize OpsCopilot Chat
  initOpsCopilotChat(evt);

  // Show panel
  dom.detailSlideoverOverlay.classList.add('active');
  dom.detailSlideoverPanel.classList.add('active');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function closeDetailSlideover() {
  dom.detailSlideoverOverlay.classList.remove('active');
  dom.detailSlideoverPanel.classList.remove('active');
  state.selectedEventId = null;
}

// Update Slideover controls states based on incident lifecycle
function updateStatusControlsUI(evt) {
  dom.detailStatusBadge.innerText = evt.status;
  dom.detailStatusBadge.className = `status-pill ${evt.status.toLowerCase()}`;

  if (evt.status === 'Active') {
    dom.rsvpActionBtn.disabled = false;
    dom.rsvpActionBtn.className = 'btn btn-primary';
    dom.rsvpActionBtn.innerHTML = `<i data-lucide="check-square"></i><span>Acknowledge Alert</span>`;
    
    dom.resolveActionBtn.disabled = false;
    dom.resolveActionBtn.className = 'btn btn-secondary';
  } else if (evt.status === 'Acknowledged') {
    dom.rsvpActionBtn.disabled = true;
    dom.rsvpActionBtn.className = 'btn btn-secondary';
    dom.rsvpActionBtn.innerHTML = `<i data-lucide="shield-check"></i><span>Alert Acknowledged</span>`;
    
    dom.resolveActionBtn.disabled = false;
    dom.resolveActionBtn.className = 'btn btn-primary';
  } else if (evt.status === 'Resolved') {
    dom.rsvpActionBtn.disabled = true;
    dom.rsvpActionBtn.className = 'btn btn-secondary';
    dom.rsvpActionBtn.innerHTML = `<i data-lucide="shield"></i><span>Event Resolved</span>`;
    
    dom.resolveActionBtn.disabled = true;
    dom.resolveActionBtn.className = 'btn btn-secondary';
  }

  if (window.lucide) window.lucide.createIcons();
}

// Acknowledge Button Action
function handleAcknowledgeAlertClick() {
  const eventId = state.selectedEventId;
  const evt = state.events.find(e => e.id === eventId);
  if (!evt || evt.status !== 'Active') return;

  if (state.useAPI) {
    handleAcknowledgeAlertAPIClick(eventId);
    return;
  }

  evt.status = 'Acknowledged';
  
  // Append audit trail to terminal log tail
  const timeStr = new Date().toISOString().split('T')[1].substring(0, 8);
  evt.syslogs.push({ 
    level: 'success', 
    msg: `syslog: [${timeStr}] operator acknowledged incident event, MTTA metric halted` 
  });

  saveToStorage();
  updateStatusControlsUI(evt);
  renderLogTerminalTail(evt.syslogs);
  renderApp();

  showToast(`Incident ${evt.id} has been acknowledged.`);
}

// Resolve Button Action
function handleResolveAlertClick() {
  const eventId = state.selectedEventId;
  const evt = state.events.find(e => e.id === eventId);
  if (!evt || evt.status === 'Resolved') return;

  if (state.useAPI) {
    handleResolveAlertAPIClick(eventId);
    return;
  }

  evt.status = 'Resolved';
  
  // Append resolution trace to syslog tail
  const timeStr = new Date().toISOString().split('T')[1].substring(0, 8);
  evt.syslogs.push({ 
    level: 'success', 
    msg: `syslog: [${timeStr}] metric recovery achieved: system telemetry cleared. Alert Resolved.` 
  });

  saveToStorage();
  updateStatusControlsUI(evt);
  renderLogTerminalTail(evt.syslogs);
  renderApp();

  showToast(`Incident ${evt.id} successfully marked as Resolved.`);
}

// --- RENDER RAW TELEMETRY TERMINAL SYSTEM LOGS ---
function renderLogTerminalTail(logs) {
  dom.detailLogTerminal.innerHTML = '';
  
  logs.forEach(log => {
    const p = document.createElement('p');
    p.className = `log-line ${log.level}`;
    p.innerText = log.msg;
    dom.detailLogTerminal.appendChild(p);
  });

  // Scroll to bottom
  dom.detailLogTerminal.scrollTop = dom.detailLogTerminal.scrollHeight;
}

// --- RENDER DYNAMIC SVG CHARTS PANEL ---
function renderAnalyticsTimeline(evt) {
  const lastTelemPoint = evt.telemetryData[evt.telemetryData.length - 1].value;
  
  // Resource Timelines title metrics
  if (evt.threshold.includes('db_connections')) {
    dom.chartLoadMetric.innerText = `${lastTelemPoint} Sockets`;
  } else if (evt.threshold.includes('ssl_expiry')) {
    dom.chartLoadMetric.innerText = `${lastTelemPoint} Days left`;
  } else if (evt.threshold.includes('exit_code')) {
    dom.chartLoadMetric.innerText = `Exit Code: ${lastTelemPoint}`;
  } else {
    dom.chartLoadMetric.innerText = `${lastTelemPoint}% Util`;
  }

  const histSum = evt.historicalAlerts.reduce((a,b)=>a+b, 0);
  dom.chartHistoryMetric.innerText = `${histSum} Events`;

  // Draw Line Chart CPU stress Timelines SVG with ML forecasts
  generateTelemetryLineChart(evt.telemetryData, evt.mlDiagnostics ? evt.mlDiagnostics.forecastData : null);

  // Draw Bar Chart Historical Host Incident frequencies SVG
  generateTelemetryBarChart(evt.historicalAlerts);
}

// 1. Telemetry Line Chart SVG Generator
function generateTelemetryLineChart(data, forecastData = null) {
  dom.lineChartWrapper.innerHTML = '';
  
  const w = 290;
  const h = 100;
  const padX = 25;
  const padY = 15;

  const chartW = w - (padX * 2);
  const chartH = h - (padY * 2);

  const hasForecast = forecastData && forecastData.length > 0;
  const totalSteps = hasForecast ? (data.length + forecastData.length - 1) : (data.length - 1); // 14 or 9

  // Max value threshold calculations
  const allValues = data.map(d => d.value);
  if (hasForecast) {
    forecastData.forEach(d => allValues.push(d.value));
  }
  const maxVal = Math.max(...allValues, 10);
  
  const getX = (index) => padX + (index * (chartW / totalSteps));
  const getY = (val) => h - padY - ((val / maxVal) * chartH);

  let svg = `<svg class="svg-chart" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
  `;

  // Horizontal system grids lines
  for (let i = 0; i <= 3; i++) {
    const yVal = (maxVal / 3) * i;
    const yPos = getY(yVal);
    svg += `<line class="chart-grid-line" x1="${padX}" y1="${yPos}" x2="${w - padX}" y2="${yPos}" />`;
  }

  // Draw vector paths
  let pathD = `M ${getX(0)} ${getY(data[0].value)}`;
  let areaD = `M ${getX(0)} ${h - padY} L ${getX(0)} ${getY(data[0].value)}`;

  for (let i = 1; i < data.length; i++) {
    pathD += ` L ${getX(i)} ${getY(data[i].value)}`;
    areaD += ` L ${getX(i)} ${getY(data[i].value)}`;
  }
  
  areaD += ` L ${getX(data.length - 1)} ${h - padY} Z`;

  // Draw Area fill
  svg += `<path class="chart-area" d="${areaD}" />`;

  // Draw Line
  svg += `<path class="chart-line" d="${pathD}" />`;

  // Draw Forecast Line if present
  if (hasForecast) {
    let forecastPathD = `M ${getX(data.length - 1)} ${getY(data[data.length - 1].value)}`;
    for (let i = 0; i < forecastData.length; i++) {
      forecastPathD += ` L ${getX(data.length - 1 + 1 + i)} ${getY(forecastData[i].value)}`;
    }
    svg += `<path class="chart-line-forecast" d="${forecastPathD}" />`;
  }

  // Points & Labels for historical data
  data.forEach((d, idx) => {
    const cx = getX(idx);
    const cy = getY(d.value);
    
    // Grid Node
    svg += `<circle class="chart-point" cx="${cx}" cy="${cy}">
      <title>${d.step}: ${d.value}</title>
    </circle>`;
    
    // Metric Labels
    if (idx === 0 || idx === Math.floor(data.length / 2) || idx === data.length - 1) {
      svg += `<text class="chart-label" x="${cx}" y="${h - 2}">${d.step}</text>`;
    }
  });

  // Labels for forecast data if present
  if (hasForecast) {
    const lastForecastIdx = data.length + forecastData.length - 1;
    const lastForecastX = getX(lastForecastIdx);
    svg += `<text class="chart-label" x="${lastForecastX}" y="${h - 2}">${forecastData[forecastData.length - 1].step}</text>`;
  }

  svg += `</svg>`;
  dom.lineChartWrapper.innerHTML = svg;
}

// 2. Telemetry Incident Bar Chart SVG Generator
function generateTelemetryBarChart(alerts) {
  dom.barChartWrapper.innerHTML = '';
  
  const w = 290;
  const h = 100;
  const padX = 25;
  const padY = 15;

  const chartW = w - (padX * 2);
  const chartH = h - (padY * 2);

  // star mapping translates to: [Info, Warning, Minor, Major, Critical]
  const labels = ['Info', 'Warn', 'Minor', 'Major', 'Crit'];
  const maxVal = Math.max(...alerts, 5);
  const barCount = alerts.length;
  
  const barSpacing = chartW / barCount;
  const barW = barSpacing * 0.65;

  let svg = `<svg class="svg-chart" viewBox="0 0 ${w} ${h}">`;

  // Grids
  for (let i = 0; i <= 3; i++) {
    const yPos = padY + (chartH / 3) * i;
    svg += `<line class="chart-grid-line" x1="${padX}" y1="${yPos}" x2="${w - padX}" y2="${yPos}" />`;
  }

  alerts.forEach((count, idx) => {
    const barH = (count / maxVal) * chartH;
    const xPos = padX + (barSpacing * idx) + (barSpacing - barW) / 2;
    const yPos = h - padY - barH;

    // Severity coloring overrides in bars
    let colorClass = 'chart-bar';
    if (idx === 4) colorClass += ' active'; // Critical bar gets distinct neon red color mapping

    // Draw Column rect
    svg += `<rect class="${colorClass}" x="${xPos}" y="${yPos}" width="${barW}" height="${barH}">
      <title>${labels[idx]}: ${count} historic alerts</title>
    </rect>`;

    // Add Star label
    svg += `<text class="chart-label" x="${xPos + barW/2}" y="${h - 2}">${labels[idx]}</text>`;
  });

  svg += `</svg>`;
  dom.barChartWrapper.innerHTML = svg;
}

// --- UTILITY FORMAT DATE RELATIVE TIME ---
function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// --- UTILITY TOAST POPUP NOTIFICATION ---
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.innerHTML = `
    <i data-lucide="${isError ? 'alert-triangle' : 'check-circle-2'}" style="width: 16px; height: 16px;"></i>
    <span>${message}</span>
  `;
  
  dom.toastContainer.appendChild(toast);
  
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.classList.add('active');
  }, 10);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 3500);
}

// ============================================================================
// --- OpsCopilot AI DIAGNOSTICS CHAT ENGINE ---
// ============================================================================

// Initialize AI Chat upon details slide-over load
function initOpsCopilotChat(evt) {
  if (!dom.chatHistoryLog || !dom.chatSuggestedPrompts) return;

  // Clear previous chat logs & inputs
  dom.chatHistoryLog.innerHTML = '';
  dom.chatTextInput.value = '';

  // Render dynamic AI welcoming bubble
  const greetingText = `Hello Operator! I am analyzing diagnostics for Host **${evt.host}**. I detected a active **${evt.severity}** alert regarding: **${evt.summary}** impacting your **${evt.service}** infrastructure.

Ask me **"Why did this alert trigger?"** or **"How do I resolve this?"** to retrieve immediate telemetry diagnostic recommendations.`;

  addAssistantMessage(greetingText);

  // Setup Suggested Prompts
  dom.chatSuggestedPrompts.innerHTML = '';

  const prompts = [
    { text: 'Why did this trigger?', icon: 'help-circle' },
    { text: 'How do I resolve this?', icon: 'wrench' }
  ];

  prompts.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggested-pill';
    btn.innerText = p.text;
    
    btn.addEventListener('click', () => {
      handleSuggestedPromptClick(p.text, evt);
    });

    dom.chatSuggestedPrompts.appendChild(btn);
  });
}

function handleSuggestedPromptClick(text, evt) {
  addOperatorMessage(text);
  simulateAIResponse(text, evt);
}

function handleChatSubmit() {
  const text = dom.chatTextInput.value.trim();
  if (!text) return;

  const eventId = state.selectedEventId;
  const evt = state.events.find(e => e.id === eventId);
  if (!evt) return;

  addOperatorMessage(text);
  dom.chatTextInput.value = '';

  simulateAIResponse(text, evt);
}

// Add Operator chat bubble (Right Aligned)
function addOperatorMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble operator';
  bubble.innerText = text;
  
  dom.chatHistoryLog.appendChild(bubble);
  dom.chatHistoryLog.scrollTop = dom.chatHistoryLog.scrollHeight;
}

// Add Assistant AI chat bubble (Left Aligned with styling parsing)
function addAssistantMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble assistant';
  
  // Custom simple parsing for markdown bold (**) and inline code (`)
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  bubble.innerHTML = html;
  
  dom.chatHistoryLog.appendChild(bubble);
  dom.chatHistoryLog.scrollTop = dom.chatHistoryLog.scrollHeight;
}

// Telemetry thinking delay simulation
function simulateAIResponse(query, evt) {
  // Disable form input temporarily
  dom.chatTextInput.disabled = true;

  // Insert Typing placeholder dot bubble
  const typingNode = document.createElement('div');
  typingNode.className = 'chat-bubble assistant typing-bubble';
  typingNode.id = 'chat-typing-node';
  typingNode.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  
  dom.chatHistoryLog.appendChild(typingNode);
  dom.chatHistoryLog.scrollTop = dom.chatHistoryLog.scrollHeight;

  // 750ms diagnostic delay
  setTimeout(() => {
    // Delete typing node
    const node = document.getElementById('chat-typing-node');
    if (node) node.remove();

    // Re-enable input
    dom.chatTextInput.disabled = false;
    dom.chatTextInput.focus();

    // Select response payload
    const reply = getOpsCopilotDiagnostic(query, evt);
    addAssistantMessage(reply);
    
    if (window.lucide) window.lucide.createIcons();
  }, 750);
}

// OpsCopilot Telemetry & Diagnostics Brain Mapper
function getOpsCopilotDiagnostic(query, evt) {
  const q = query.toLowerCase().trim();

  // 0. ML Diagnostics / Forecasting queries
  if (q.includes('predict') || q.includes('forecast') || q.includes('ml') || q.includes('model') || q.includes('anomaly')) {
    if (evt.mlDiagnostics) {
      const forecastPoints = evt.mlDiagnostics.forecastData.map(pt => `${pt.step} (${pt.value})`).join(', ');
      return `PulseOps ML Predictive Analytics for **${evt.id}**:
1. **Anomaly Confidence**: **${evt.mlDiagnostics.confidenceScore}%** probability rating.
2. **Classification**: \`${evt.mlDiagnostics.classification}\`.
3. **Statistical Trend**: Detected a telemetry load slope of **${evt.mlDiagnostics.slope > 0 ? '+' : ''}${evt.mlDiagnostics.slope}** per step with standard deviation **${evt.mlDiagnostics.stdDev}**.
4. **5-Step Forecast**: Future estimated values are projected as: **[${forecastPoints}]**.
5. **Autopilot Insights**: ${evt.mlDiagnostics.explanation}`;
    } else {
      return `Our Machine Learning engine is offline, but standard threshold rule alerts are actively monitored for Host **${evt.host}**.`;
    }
  }

  // 1. Diagnostics "Why did this alert trigger?" mapping
  if (q.includes('why') || q.includes('trigger') || q.includes('happen') || q.includes('cause')) {
    
    // Check OOM memory leak
    if (evt.id === 'EVT-2026-9041') {
      return `Telemetry analysis for **${evt.id}**:
1. **Heap Exhaustion**: Node heap memory hit **99%** allocation ceiling, exhausting worker capacity limits.
2. **OOM Daemon**: Kernel system logs indicate process \`PID 23908 (node)\` triggered standard memory saturation threshold alerts and was terminated by Linux's Out-Of-Memory killer.
3. **Trigger Point**: Breach occurred at \`system_memory_usage > 98%\` during continuous API batch loads.`;
    }
    
    // Check Client sockets pool Postgres
    if (evt.id === 'EVT-2026-7844') {
      return `Database incident analysis for **${evt.id}**:
1. **Max connections reached**: Active Postgres transaction connections breached limits ceiling at **502 connections** (system cap: 500).
2. **TCP socket blockages**: New connection handshakes from Billing API services are timing out or being hard rejected.
3. **Root Cause**: Microservice connection locks are remaining active due to missing connection closures in checkout routes.`;
    }
    
    // Check SSL Expiry Ingress
    if (evt.id === 'EVT-2026-6122') {
      return `Ingress TLS expiry alert analysis for **${evt.id}**:
1. **Time Constraint Warning**: Wildcard SSL certificate reaches safety margin limit: **14 days remaining** before expiry out.
2. **Challenge blockages**: Automated renewing loops by Let's Encrypt Cert-Manager timed out (DNS challenge validation returned HTTP 403 Forbidden).
3. **Action Required**: operators must verify Cloudflare API DNS sector integration keys.`;
    }

    // Check Disk Partition 80% Minor alert
    if (evt.id === 'EVT-2026-1051') {
      return `Storage sector analysis for **${evt.id}**:
1. **Capacity warning limits**: Volume Mount \`/\` reached partition capacity of **80%** (160GB allocated blocks).
2. **Index logs size**: Heavy Elasticsearch and index segments are writing dense files.
3. **Logrotate state**: Daily logs rotation skipped logs compression due to thread locks, but resolved manually by operator.`;
    }

    // Check CPU saturation 75% Minor alert
    if (evt.id === 'EVT-2026-1052') {
      return `CPU execution thread diagnostics for **${evt.id}**:
1. **Metric limit hit**: Active CPU utilization reached **76%** workload stress (warning limit: 75%).
2. **Queue saturation**: System telemetry reports batch routing queues processing peak queue loads.
3. **Scale state**: Cluster has not scaled yet; triggering pod worker replica allocations is suggested.`;
    }

    // Check disk I/O bottleneck minor alert
    if (evt.id === 'EVT-2026-1053') {
      return `Disk I/O block queue bottleneck analysis for **${evt.id}**:
1. **Block channel queues**: High disk wait times breached threshold, bottlenecking at **840ms** average lag times.
2. **Resource locks**: Postgres VACUUM sequential scans on transactional table are locking device block queues.
3. **Resulting metrics**: Transaction connection pools are slowing down due to write delays.`;
    }

    // Check SAN block write latency minor alert
    if (evt.id === 'EVT-2026-1054') {
      return `SAN block storage subsystem lag analysis for **${evt.id}**:
1. **Storage Controller latency**: Read/write storage lag breached limits, peaking at **68.2ms** (target limit: 50ms).
2. **Fibre Channels failures**: Network drops on physical switch ports dropped storage transfer speeds.
3. **Active rebuilds**: Raid arrays controller actively running disk sector rebuild operations, creating queue latency loops.`;
    }

    // Generic Incident Explanations
    return `Incident telemetry analysis for **${evt.id}**:
1. **Threshold Breach**: Host **${evt.host}** triggered alert rule \`${evt.threshold}\` (recorded value: **${evt.telemetryData[evt.telemetryData.length - 1].value}**).
2. **Log triggers**: Syslog records report: \`"${evt.summary}"\`.
3. **State**: The operational system flag is currently in \`${evt.status}\` status.`;
  }

  // 2. Playbooks / Remediation "How do I resolve this?" mapping
  if (q.includes('resolve') || q.includes('how') || q.includes('fix') || q.includes('playbook') || q.includes('action')) {
    
    // Playbook OOM leak
    if (evt.id === 'EVT-2026-9041') {
      return `Here is the Incident response playbook to recover from Node OOM:
1. **Process check**: Look for locked node threads:
   \`ps aux | grep node\`
2. **Force terminate**: Kill OOM thrashing PID:
   \`kill -9 23908\`
3. **Expand heap allocation limits**: Adjust node thread allocation parameters:
   \`node --max-old-space-size=4096 server.js\`
4. **Reboot systemd worker service**:
   \`systemctl restart api-service-worker-03\``;
    }
    
    // Playbook Sockets Postgres
    if (evt.id === 'EVT-2026-7844') {
      return `Incident response playbook for Postgres socket limit saturation:
1. **Query active connections stats**:
   \`SELECT count(*), state FROM pg_stat_activity GROUP BY state;\`
2. **Terminate idle socket blockages**:
   \`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';\`
3. **Increase maximum sockets ceiling**: Tune parameters inside \`postgresql.conf\`:
   \`max_connections = 800\`
4. **Flush database redis caches**:
   \`redis-cli flushall\``;
    }

    // Playbook SSL expiry
    if (evt.id === 'EVT-2026-6122') {
      return `Incident response playbook for Cert-Manager TLS DNS validation failures:
1. **Verify ACME validation pods status**:
   \`kubectl get challenges -n Ingress\`
2. **Test Cloudflare DNS API synchronization keys**:
   \`curl -X GET "https://api.cloudflare.com/client/v4/zones" -H "Authorization: Bearer <API_KEY>"\`
3. **Force ACME cert challenge re-validation**:
   \`kubectl delete certificate *.pulseops.io -n Ingress\`
   \`kubectl apply -f certificates.yaml\``;
    }

    // Playbook Disk Partition 80% Minor alert
    if (evt.id === 'EVT-2026-1051') {
      return `Incident response playbook for Disk capacity limits:
1. **Trace large block directories**:
   \`du -h --max-depth=2 /var/log\`
2. **Force syslog logrotate compression compression**:
   \`logrotate -f /etc/logrotate.d/rsyslog\`
3. **Clean Kubernetes Docker node caches**:
   \`docker system prune -a --volumes\``;
    }

    // Playbook CPU saturation 75% Minor alert
    if (evt.id === 'EVT-2026-1052') {
      return `Incident response playbook for CPU saturation:
1. **Check process core consumption**:
   \`top -o %CPU\`
2. **Scale Pod replicas count**:
   \`kubectl scale deployment/batch-scheduler --replicas=6 -n ops\`
3. **Optimize process thread pool variables**: Increase thread allocation limits on host controller.`;
    }

    // Playbook Disk I/O Bottleneck minor alert
    if (evt.id === 'EVT-2026-1053') {
      return `Incident response playbook for Database Disk I/O blockages:
1. **Check active disk I/O metrics**:
   \`iostat -xz 1 10\`
2. **Find Postgres blocking backend PID**:
   \`SELECT pid, query, state FROM pg_stat_activity WHERE wait_event_type = 'IO';\`
3. **Terminate sequential scan blocking vacuum**:
   \`SELECT pg_cancel_backend(10228);\`
4. **Tune PostgreSQL shared buffers to minimize active disk writes**.`;
    }

    // Playbook SAN latency >50ms minor alert
    if (evt.id === 'EVT-2026-1054') {
      return `Incident response playbook for SAN block storage subsystem latency:
1. **Check HBA fiber ports connection details**:
   \`fcinfo hba-port\` or \`cat /sys/class/fc_host/host*/port_state\`
2. **Verify active disk raid rebuilding status**:
   \`storcli /c0/eall/sall show rebuild\`
3. **Query device block read queue parameters**:
   \`cat /sys/block/sdb/queue/rotational\` (Ensure SSD optimization flags are active).`;
    }

    // Generic Incident Playbooks
    return `Generic Incident playbook response:
1. **Trace syslog error outputs**:
   \`journalctl -xe -u alert-manager\`
2. **Check system CPU/RAM metrics**:
   \`top -b -n 1 | head -n 20\`
3. **Examine open file descriptors limitations**:
   \`lsof | wc -l\``;
  }

  // 3. Conversational Ops helper fallback replies
  return `Understood. I am tracking Host **${evt.host}** syslog metrics tail and resource trends. 

To resolve the **${evt.severity}** alert regarding \`"${evt.summary}"\`, I suggest querying:
1. **"Why did this alert trigger?"** (telemetry diagnostics trace)
2. **"How do I resolve this?"** (monospaced remediation CLI playbooks)

Alternatively, check target socket connections using \`netstat -tlpn\` or read standard journald logs: \`journalctl -u cron-agent -n 30\`.`;
}

// --- FastAPI TELEMETRY BACKEND REST COMMUNICATION HELPERS ---

async function handleSimulatedAlertAPISubmit(severity, host, summary, description, service, threshold, pattern) {
  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity,
        host,
        summary,
        description,
        service,
        threshold,
        chartPattern: pattern
      })
    });

    if (res.ok) {
      const newEvent = await res.json();
      state.events.unshift(newEvent);
      renderApp();
      
      dom.simulateModal.classList.remove('active');
      dom.simulateAlertForm.reset();
      
      showToast(`Simulated Incident injected via FastAPI on ${host}!`, severity === 'Critical');
    } else {
      showToast("FastAPI alert simulation failed.", true);
    }
  } catch (e) {
    console.error("FastAPI simulation error", e);
    showToast("FastAPI backend connection error.", true);
  }
}

async function handleAcknowledgeAlertAPIClick(eventId) {
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}/acknowledge`, { method: 'POST' });
    if (res.ok) {
      const updatedEvent = await res.json();
      
      // Update local array
      const idx = state.events.findIndex(e => e.id === eventId);
      if (idx !== -1) {
        state.events[idx] = updatedEvent;
      }

      updateStatusControlsUI(updatedEvent);
      renderLogTerminalTail(updatedEvent.syslogs);
      renderApp();
      
      showToast(`Incident ${eventId} acknowledged via Python API.`);
    } else {
      showToast("FastAPI Acknowledge request failed.", true);
    }
  } catch (e) {
    console.error("FastAPI acknowledge error", e);
    showToast("FastAPI connection error.", true);
  }
}

async function handleResolveAlertAPIClick(eventId) {
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}/resolve`, { method: 'POST' });
    if (res.ok) {
      const updatedEvent = await res.json();
      
      // Update local array
      const idx = state.events.findIndex(e => e.id === eventId);
      if (idx !== -1) {
        state.events[idx] = updatedEvent;
      }

      updateStatusControlsUI(updatedEvent);
      renderLogTerminalTail(updatedEvent.syslogs);
      renderApp();
      
      showToast(`Incident ${eventId} resolved via Python API.`);
    } else {
      showToast("FastAPI Resolve request failed.", true);
    }
  } catch (e) {
    console.error("FastAPI resolve error", e);
    showToast("FastAPI connection error.", true);
  }
}
