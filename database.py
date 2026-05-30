from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# --- PYDANTIC TELEMETRY SCHEMAS ---

class TelemetryPoint(BaseModel):
    step: str
    value: float

class SyslogEntry(BaseModel):
    level: str
    msg: str

class MLDiagnostics(BaseModel):
    confidenceScore: float
    classification: str
    explanation: str
    forecastData: List[TelemetryPoint]
    slope: float
    stdDev: float

class Event(BaseModel):
    id: str
    severity: str
    host: str
    summary: str
    description: str
    timestamp: str
    status: str
    service: str
    threshold: str
    chartPattern: str
    telemetryData: List[TelemetryPoint]
    historicalAlerts: List[int]
    syslogs: List[SyslogEntry]
    mlDiagnostics: Optional[MLDiagnostics] = None

class CreateEventRequest(BaseModel):
    severity: str = Field(..., example="Critical")
    host: str = Field(..., example="prod-api-01")
    summary: str = Field(..., example="CPU core utilization hit limits threshold")
    description: str = Field(..., example="Full diagnostic call stack trace details...")
    service: str = Field(..., example="API Gateway Routing")
    threshold: str = Field(..., example="cpu_usage > 95%")
    chartPattern: str = Field("spike", example="spike")

# --- SEED IN-MEMORY INCIDENTS DATABASE ---
DATABASE: List[Event] = [
  Event(
    id="EVT-2026-9041",
    severity="Critical",
    host="prod-api-shard-03.internal",
    summary="Out of Memory (OOM) killer terminated Node process (ID: 23908)",
    description="System memory utilization breached critical heap limit of 98%. Linux kernel invoked OOM-killer daemon, terminating primary node worker task. Auto-restart loop failing due to persistent memory exhaustion in cluster deployment.",
    timestamp=datetime.now().isoformat(),
    status="Active",
    service="Checkout Billing API",
    threshold="system_memory_usage > 98%",
    chartPattern="leak",
    telemetryData=[
      {"step": "-45m", "value": 45.0},
      {"step": "-40m", "value": 50.0},
      {"step": "-35m", "value": 58.0},
      {"step": "-30m", "value": 65.0},
      {"step": "-25m", "value": 74.0},
      {"step": "-20m", "value": 81.0},
      {"step": "-15m", "value": 88.0},
      {"step": "-10m", "value": 94.0},
      {"step": "-5m", "value": 97.0},
      {"step": "Trigger", "value": 99.0}
    ],
    historicalAlerts=[14, 25, 8, 3, 1],
    syslogs=[
      {"level": "info", "msg": "systemd[1]: Starting Node.js API Service worker-03..."},
      {"level": "info", "msg": "node[23908]: Bootstrapping application on port 8080. Cluster active."},
      {"level": "info", "msg": "node[23908]: Heap allocations stabilized at 2.4GB."},
      {"level": "warn", "msg": "node[23908]: [GC-Warning] Garbage Collection duration exceeded 1200ms."},
      {"level": "warn", "msg": "node[23908]: High heap saturation: 89% capacity reached."},
      {"level": "info", "msg": "kernel: [389104.912] rsyslogd: system limit threshold triggered: low memory pool"},
      {"level": "error", "msg": "kernel: [389108.109] Out of memory: Kill process 23908 (node) score 982 or sacrifice child"},
      {"level": "error", "msg": "systemd[1]: api-service-worker-03.service: Main process exited, code=killed, status=9/KILL"}
    ]
  ),
  Event(
    id="EVT-2026-7844",
    severity="Major",
    host="rds-postgres-replica-01.db",
    summary="Active client pool exhaustion: database socket failures",
    description="PostgreSQL instance reached maximum allowed active client sockets (max_connections = 500). Subsequent connection attempts from web microservices are actively rejected with socket time-out exceptions.",
    timestamp=datetime.now().isoformat(),
    status="Acknowledged",
    service="Customer Data Store",
    threshold="active_db_connections >= 500",
    chartPattern="spike",
    telemetryData=[
      {"step": "-45m", "value": 120.0},
      {"step": "-40m", "value": 140.0},
      {"step": "-35m", "value": 135.0},
      {"step": "-30m", "value": 150.0},
      {"step": "-25m", "value": 180.0},
      {"step": "-20m", "value": 240.0},
      {"step": "-15m", "value": 310.0},
      {"step": "-10m", "value": 420.0},
      {"step": "-5m", "value": 495.0},
      {"step": "Trigger", "value": 502.0}
    ],
    historicalAlerts=[45, 12, 5, 15, 2],
    syslogs=[
      {"level": "info", "msg": "postgres[491]: database system is ready to accept connections on port 5432"},
      {"level": "info", "msg": "postgres[881]: checkpointer process started"},
      {"level": "info", "msg": "postgres[9902]: connection authorized: user=billing_app database=prod_checkout"},
      {"level": "warn", "msg": "postgres[10123]: warning: connection pool saturation reaching 90% (450/500)"},
      {"level": "warn", "msg": "postgres[10220]: connection limit warnings sent to ingress-gateway proxies"},
      {"level": "error", "msg": "postgres[10591]: FATAL: remaining connection slots are reserved for non-replication superuser connections"},
      {"level": "error", "msg": "postgres[10593]: FATAL: connection limit exceeded for database \"prod_checkout\""},
      {"level": "warn", "msg": "consul-agent: health check failing for postgresql instance replica-01"}
    ]
  ),
  Event(
    id="EVT-2026-6122",
    severity="Minor",
    host="k8s-ingress-gateway.cluster",
    summary="SSL / TLS Certificate expiring in 14 days",
    description="Let's Encrypt TLS certificate for domain wildcard *.pulseops.io will expire in exactly 14 days (June 13, 2026). ACME automated renewals are failing due to DNS validation timeout constraints.",
    timestamp=datetime.now().isoformat(),
    status="Active",
    service="User Routing Ingress",
    threshold="ssl_expiry_days <= 14",
    chartPattern="steady",
    telemetryData=[
      {"step": "-45m", "value": 14.0},
      {"step": "-40m", "value": 14.0},
      {"step": "-35m", "value": 14.0},
      {"step": "-30m", "value": 14.0},
      {"step": "-25m", "value": 14.0},
      {"step": "-20m", "value": 14.0},
      {"step": "-15m", "value": 14.0},
      {"step": "-10m", "value": 14.0},
      {"step": "-5m", "value": 14.0},
      {"step": "Trigger", "value": 14.0}
    ],
    historicalAlerts=[80, 5, 2, 0, 0],
    syslogs=[
      {"level": "info", "msg": "ingress-controller: starting ACME challenge process for domain pulseops.io"},
      {"level": "info", "msg": "ingress-controller: dispatching DNS-01 verification records to Cloudflare DNS"},
      {"level": "warn", "msg": "ingress-controller: DNS propagation check timed out after 300 seconds"},
      {"level": "warn", "msg": "ingress-controller: retrying ACME challenge validation (attempt 2 of 3)..."},
      {"level": "warn", "msg": "ingress-controller: challenge response verification failure: 403 Forbidden"},
      {"level": "error", "msg": "ingress-controller: TLS Certificate for wildcard *.pulseops.io reaches critical expiry window (14 days left)"},
      {"level": "warn", "msg": "systemd[1]: ingress-gateway-cert-manager.service: Main process exited with code=1"}
    ]
  ),
  Event(
    id="EVT-2026-1051",
    severity="Minor",
    host="prod-app-server-02.infra",
    summary="Disk partition root space capacity has reached 80%",
    description="Alert triggered on root partition /. Space capacity utilization breached Warning/Minor boundary threshold, currently occupied at 80% (160GB occupied of 200GB allocated volume size). Cluster scheduler recommends log compressions or cache sweeps.",
    timestamp=datetime.now().isoformat(),
    status="Active",
    service="System Volume Monitor",
    threshold="disk_space_utilization >= 80%",
    chartPattern="leak",
    telemetryData=[
      {"step": "-45m", "value": 71.0},
      {"step": "-40m", "value": 72.0},
      {"step": "-35m", "value": 73.0},
      {"step": "-30m", "value": 75.0},
      {"step": "-25m", "value": 76.0},
      {"step": "-20m", "value": 77.0},
      {"step": "-15m", "value": 78.0},
      {"step": "-10m", "value": 79.0},
      {"step": "-5m", "value": 79.0},
      {"step": "Trigger", "value": 80.0}
    ],
    historicalAlerts=[58, 24, 12, 1, 0],
    syslogs=[
      {"level": "info", "msg": "df-monitor: executing space diagnostic telemetry on volume mount /..."},
      {"level": "info", "msg": "df-monitor: dev/xvda2 allocated sector blocks: total 419430400, free 83886080"},
      {"level": "warn", "msg": "df-monitor: partition / has reached 80% disk capacity threshold limits"},
      {"level": "warn", "msg": "systemd: warning sent to alert-manager: disk volume space low"},
      {"level": "info", "msg": "logrotate: triggering automated cleanup routines for old journal logs..."},
      {"level": "success", "msg": "logrotate: reclaimed 850MB from systemd logs. Current capacity stabilized."}
    ]
  ),
  Event(
    id="EVT-2026-1052",
    severity="Minor",
    host="k8s-pod-worker-08.cluster",
    summary="Node execution CPU utilization has reached 75%",
    description="Kubernetes pod node CPU utilization reached the minor metric capacity threshold of 75% under concurrent API batch queues. Pod horizontal auto-scaler scheduler suggests launching extra routing instances.",
    timestamp=datetime.now().isoformat(),
    status="Active",
    service="Batch Process Scheduler",
    threshold="cpu_utilization >= 75%",
    chartPattern="spike",
    telemetryData=[
      {"step": "-45m", "value": 24.0},
      {"step": "-40m", "value": 28.0},
      {"step": "-35m", "value": 31.0},
      {"step": "-30m", "value": 27.0},
      {"step": "-25m", "value": 35.0},
      {"step": "-20m", "value": 42.0},
      {"step": "-15m", "value": 58.0},
      {"step": "-10m", "value": 68.0},
      {"step": "-5m", "value": 72.0},
      {"step": "Trigger", "value": 76.0}
    ],
    historicalAlerts=[180, 54, 8, 3, 0],
    syslogs=[
      {"level": "info", "msg": "kubelet[12]: health monitoring reporting worker pod-08 cpu threads active"},
      {"level": "info", "msg": "kube-proxy: active sockets balancing loads across cluster proxies"},
      {"level": "warn", "msg": "kubelet[12]: cpu usage warning threshold breached: current core util 75%"},
      {"level": "warn", "msg": "hpa-controller: system utilization exceeds metrics-server target limits (70%)"},
      {"level": "info", "msg": "hpa-controller: dispatching scale request to replica controllers..."}
    ]
  ),
  Event(
    id="EVT-2026-1053",
    severity="Minor",
    host="prod-db-postgres-02.internal",
    summary="Disk I/O bottleneck: thread wait-time blockages identified",
    description="Storage area disk channels reporting high queue blockages. The disk system I/O wait-time metrics exceeded the minor threshold (800ms) under heavy database index re-scanning, slowing connection cycles.",
    timestamp=datetime.now().isoformat(),
    status="Acknowledged",
    service="Transactional Database Engine",
    threshold="disk_io_wait_time >= 800ms",
    chartPattern="steady",
    telemetryData=[
      {"step": "-45m", "value": 780.0},
      {"step": "-40m", "value": 795.0},
      {"step": "-35m", "value": 810.0},
      {"step": "-30m", "value": 805.0},
      {"step": "-25m", "value": 815.0},
      {"step": "-20m", "value": 820.0},
      {"step": "-15m", "value": 830.0},
      {"step": "-10m", "value": 845.0},
      {"step": "-5m", "value": 835.0},
      {"step": "Trigger", "value": 840.0}
    ],
    historicalAlerts=[35, 12, 4, 8, 1],
    syslogs=[
      {"level": "info", "msg": "postgres[991]: backend executing VACUUM ANALYZE tasks on table transactions"},
      {"level": "warn", "msg": "kernel: [8940.109] iostat warning: disk block queue waiting times exceed 800ms"},
      {"level": "warn", "msg": "postgres[991]: query sequential scan blocked waiting on block device lock"},
      {"level": "info", "msg": "syslog: connection pipeline latency monitoring warning sent to alerts server"}
    ]
  ),
  Event(
    id="EVT-2026-1054",
    severity="Minor",
    host="san-controller-storage-01.infra",
    summary="Storage subsystem reports high latency: read/write latency > 50ms",
    description="Shared Storage Area Network (SAN) controller block storage arrays experiencing sector lags. Combined read/write volume request transaction times breached target threshold limit of 50ms (average latency: 68.2ms).",
    timestamp=datetime.now().isoformat(),
    status="Active",
    service="SAN Block Storage Node",
    threshold="storage_disk_latency > 50ms",
    chartPattern="spike",
    telemetryData=[
      {"step": "-45m", "value": 12.0},
      {"step": "-40m", "value": 14.0},
      {"step": "-35m", "value": 18.0},
      {"step": "-30m", "value": 20.0},
      {"step": "-25m", "value": 16.0},
      {"step": "-20m", "value": 24.0},
      {"step": "-15m", "value": 48.0},
      {"step": "-10m", "value": 58.0},
      {"step": "-5m", "value": 65.0},
      {"step": "Trigger", "value": 68.0}
    ],
    historicalAlerts=[88, 14, 5, 2, 0],
    syslogs=[
      {"level": "info", "msg": "san-agent: heartbeat verified with fibre channel switch nodes"},
      {"level": "warn", "msg": "san-agent: disk block read time latency warning threshold limit exceeded (68.2ms > 50ms)"},
      {"level": "warn", "msg": "san-agent: raid controller storage reconstruction queue queue queue lag identified"},
      {"level": "info", "msg": "syslog: diagnostic metrics payload forwarded to telemetry control center"}
    ]
  ),
  Event(
    id="EVT-2026-1055",
    severity="Minor",
    host="analytics-logstash-01.internal",
    summary="Storage subsystem warning: transaction write latency > 50ms",
    description="Logstash bulk event forwarder block-device queue reporting transactional read/write block operations lagging over 50ms under peak batch analytics cycles. Disk writes resolved upon logs sweep.",
    timestamp=datetime.now().isoformat(),
    status="Resolved",
    service="Data Logging Pipeline",
    threshold="write_latency > 50ms",
    chartPattern="normal",
    telemetryData=[
      {"step": "-45m", "value": 8.0},
      {"step": "-40m", "value": 12.0},
      {"step": "-35m", "value": 15.0},
      {"step": "-30m", "value": 52.0},
      {"step": "-25m", "value": 54.0},
      {"step": "-20m", "value": 42.0},
      {"step": "-15m", "value": 22.0},
      {"step": "-10m", "value": 12.0},
      {"step": "-5m", "value": 6.0},
      {"step": "Trigger", "value": 4.0}
    ],
    historicalAlerts=[220, 15, 2, 0, 0],
    syslogs=[
      {"level": "info", "msg": "logstash[88]: bulk ingest indexing batch #998 started..."},
      {"level": "warn", "msg": "logstash[88]: transactional disk output write queue lag threshold breached (>50ms)"},
      {"level": "info", "msg": "logstash[88]: batch buffer storage cleared, shifting indexes to archive node"},
      {"level": "success", "msg": "logstash[88]: bulk disk output write latencies recovered to normal limits (4ms). Resolved."}
    ]
  ),
  Event(
    id="EVT-2026-4409",
    severity="Warning",
    host="elk-logging-node-02.internal",
    summary="Disk partition dev/xvda1 capacity at 89% (sector allocation stress)",
    description="Root disk partition dev/xvda1 volume size is approaching physical limits, currently occupied at 89%. Persistent log rotation script was skipped due to file descriptor locking by Elasticsearch index nodes.",
    timestamp=datetime.now().isoformat(),
    status="Resolved",
    service="Audit Log Archiver",
    threshold="disk_space_utilization >= 85%",
    chartPattern="normal",
    telemetryData=[
      {"step": "-45m", "value": 81.0},
      {"step": "-40m", "value": 82.0},
      {"step": "-35m", "value": 83.0},
      {"step": "-30m", "value": 84.0},
      {"step": "-25m", "value": 84.0},
      {"step": "-20m", "value": 86.0},
      {"step": "-15m", "value": 87.0},
      {"step": "-10m", "value": 88.0},
      {"step": "-5m", "value": 88.0},
      {"step": "Trigger", "value": 89.0}
    ],
    historicalAlerts=[120, 48, 12, 1, 0],
    syslogs=[
      {"level": "info", "msg": "rsyslogd: log rotation daemon starting cron.daily task..."},
      {"level": "info", "msg": "rsyslogd: compressing logs in /var/log/nginx/access.log..."},
      {"level": "warn", "msg": "elasticsearch[112]: disk watermarks triggered: [low] disk utilization is at 85%"},
      {"level": "warn", "msg": "elasticsearch[112]: skipping log truncation - file descriptor locked by PID 1122"},
      {"level": "warn", "msg": "rsyslogd: write error: dev/xvda1 is nearing allocated blocks limit (89% full)"},
      {"level": "success", "msg": "systemd-logind: executing index compression and cleanups for Elasticsearch older indices"},
      {"level": "success", "msg": "system: disk reclaimed 18.2GB. Current dev/xvda1 load dropped to 72%. Alert Resolved."}
    ]
  ),
  Event(
    id="EVT-2026-3021",
    severity="Info",
    host="cron-backup-agent-01.infra",
    summary="Automated nightly database storage snapshot completed successfully",
    description="Scheduled backup agent successfully exported binary snapshots of all critical relational databases. Target checksums matched, and data packets were securely archived on AWS S3 storage with glacier lifecycle rule.",
    timestamp=datetime.now().isoformat(),
    status="Resolved",
    service="Disaster Recovery Agent",
    threshold="cron_job_exit_code == 0",
    chartPattern="normal",
    telemetryData=[
      {"step": "-45m", "value": 2.0},
      {"step": "-40m", "value": 4.0},
      {"step": "-35m", "value": 8.0},
      {"step": "-30m", "value": 12.0},
      {"step": "-25m", "value": 92.0},
      {"step": "-20m", "value": 95.0},
      {"step": "-15m", "value": 45.0},
      {"step": "-10m", "value": 15.0},
      {"step": "-5m", "value": 4.0},
      {"step": "Trigger", "value": 0.0}
    ],
    historicalAlerts=[450, 10, 0, 0, 0],
    syslogs=[
      {"level": "info", "msg": "cron[102]: starting task database-backup-nightly (PID 998)"},
      {"level": "info", "msg": "backup-agent: dumping postgresql schemas to local binary backup files..."},
      {"level": "info", "msg": "backup-agent: schema dump completed in 14.9 seconds. File size: 4.82GB"},
      {"level": "info", "msg": "backup-agent: compressing payload utilizing multi-thread GZIP..."},
      {"level": "info", "msg": "backup-agent: secure upload initialized to s3://pulseops-vault/backups/"},
      {"level": "info", "msg": "backup-agent: S3 transfer complete. MD5 checksum verified successfully."},
      {"level": "success", "msg": "cron[102]: task completed successfully. Exit code: 0"}
    ]
  )
]
