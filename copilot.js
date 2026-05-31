/**
 * PulseOps AI Copilot - Floating Chat Client Controller
 * Handles user interactions, typing indicators, suggested actions,
 * and context-aware responses analyzing the master dashboard's events array.
 */

window.addEventListener('DOMContentLoaded', () => {
  setupGlobalCopilotListeners();
});

// --- CORE LISTENERS REGISTRATION ---
function setupGlobalCopilotListeners() {
  const trigger = document.getElementById('global-copilot-trigger');
  const panel = document.getElementById('global-copilot-panel');
  const textInput = document.getElementById('global-copilot-text-input');
  const closeBtn = document.getElementById('global-copilot-close');
  const inputForm = document.getElementById('global-copilot-input-form');
  const suggested = document.getElementById('global-copilot-suggested');

  if (trigger && panel) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.toggle('active');
      if (panel.classList.contains('active') && textInput) {
        setTimeout(() => textInput.focus(), 50);
      }
    });
  }

  if (closeBtn && panel) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.remove('active');
    });
  }

  if (inputForm) {
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGlobalCopilotSubmit();
    });
  }

  if (suggested) {
    const suggestedPills = suggested.querySelectorAll('.suggested-pill');
    suggestedPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const text = pill.dataset.prompt;
        const inputEl = document.getElementById('global-copilot-text-input');
        if (text && inputEl) {
          inputEl.value = text;
          handleGlobalCopilotSubmit();
        }
      });
    });
  }
}

// --- GLOBAL AI COPILOT CHAT STREAM ACTIONS ---

function handleGlobalCopilotSubmit() {
  const inputEl = document.getElementById('global-copilot-text-input');
  if (!inputEl) {
    console.error("PulseOps: global-copilot-text-input element not found!");
    return;
  }

  const text = inputEl.value.trim();
  if (!text) return;

  addGlobalOperatorMessage(text);
  inputEl.value = '';

  simulateGlobalAIResponse(text);
}

// Add user message to global chat client bubble stream
function addGlobalOperatorMessage(text) {
  const historyEl = document.getElementById('global-copilot-history');
  if (!historyEl) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble operator';
  bubble.innerText = text;

  historyEl.appendChild(bubble);
  historyEl.scrollTop = historyEl.scrollHeight;
}

// Add assistant message to global chat client bubble stream with markup parsing
function addGlobalAssistantMessage(text) {
  const historyEl = document.getElementById('global-copilot-history');
  if (!historyEl) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble assistant';

  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  bubble.innerHTML = html;

  historyEl.appendChild(bubble);
  historyEl.scrollTop = historyEl.scrollHeight;
}

// Typing delay indicator simulation
function simulateGlobalAIResponse(query) {
  const inputEl = document.getElementById('global-copilot-text-input');
  const historyEl = document.getElementById('global-copilot-history');

  if (inputEl) inputEl.disabled = true;

  const typingNode = document.createElement('div');
  typingNode.className = 'chat-bubble assistant typing-bubble';
  typingNode.id = 'global-copilot-typing-node';
  typingNode.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;

  if (historyEl) {
    historyEl.appendChild(typingNode);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  setTimeout(() => {
    const node = document.getElementById('global-copilot-typing-node');
    if (node) node.remove();

    if (inputEl) {
      inputEl.disabled = false;
      inputEl.focus();
    }

    const reply = getGlobalCopilotBrainResponse(query);
    addGlobalAssistantMessage(reply);

    if (window.lucide) window.lucide.createIcons();
  }, 850);
}

// Context-aware query analysis scanning master dashboard state
function getGlobalCopilotBrainResponse(query) {
  const q = query.toLowerCase().trim();

  // Safely check master dashboard state
  const dashboardState = window.state || { events: [] };

  // 0. Event-Specific Diagnostics / Root Cause Analysis (e.g. "Why did EVT-2026-9041 trigger?")
  const idRegex = /evt-(?:\d{4}-)?(\d+)/i;
  const directIdRegex = /evt-[a-z0-9-]+/i;
  const match = query.match(idRegex) || query.match(directIdRegex);

  if (match) {
    const matchStr = match[0].toUpperCase();
    const numericPart = query.match(idRegex) ? query.match(idRegex)[1] : "";
    
    // Find the event in the dynamic state events list
    const evt = dashboardState.events.find(e => {
      const eId = e.id.toUpperCase();
      return eId === matchStr || (numericPart && eId.includes(numericPart));
    });

    if (evt) {
      let mlDiag = evt.mlDiagnostics;
      if (!mlDiag) {
        mlDiag = getLightweightDiagnostics(evt);
      }

      const occurredTimeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'N/A';

      let sevBadge = `**[${evt.severity.toUpperCase()}]**`;
      if (evt.severity === 'Critical') sevBadge = `🚨 **[CRITICAL]**`;
      else if (evt.severity === 'Major') sevBadge = `⚠️ **[MAJOR]**`;
      else if (evt.severity === 'Minor') sevBadge = `ℹ️ **[MINOR]**`;
      else if (evt.severity === 'Warning') sevBadge = `🔔 **[WARNING]**`;

      let statusBadge = `*${evt.status}*`;

      let reply = `### 🔍 Deep Root Cause Analysis: ${evt.id}\n`;
      reply += `• **Service/Component**: \`${evt.service}\` on Host \`${evt.host}\`\n`;
      reply += `• **Severity Level**: ${sevBadge} | **Status**: ${statusBadge}\n`;
      reply += `• **Occurred Time**: ${occurredTimeStr}\n`;
      reply += `• **Configured Limit/Threshold**: \`${evt.threshold}\`\n\n`;

      reply += `#### 📋 Incident Summary\n`;
      reply += `*${evt.summary}*\n\n`;
      reply += `> ${evt.description}\n\n`;

      if (mlDiag) {
        reply += `#### 🤖 AI ML Diagnostics Forecast\n`;
        reply += `• **Anomaly Probability**: **${mlDiag.confidenceScore}%** classification confidence.\n`;
        reply += `• **Incident Classification**: \`${mlDiag.classification}\`\n`;
        reply += `• **Trend Slope**: **${mlDiag.slope > 0 ? '+' : ''}${mlDiag.slope}** units/min (Std Dev: **${mlDiag.stdDev}**)\n`;
        reply += `• **Autopilot Insight**: *${mlDiag.explanation}*\n\n`;
      }

      // Filter syslogs for warnings/errors
      const errorLogs = evt.syslogs ? evt.syslogs.filter(log => log.level === 'error' || log.level === 'warn' || log.level === 'critical') : [];
      if (errorLogs.length > 0) {
        reply += `#### 🛑 Critical Syslog Evidence\n`;
        reply += `I scanned the host log buffers and found the following relevant warning/error events:\n\`\`\`\n`;
        errorLogs.forEach(log => {
          reply += `[${log.level.toUpperCase()}] ${log.msg}\n`;
        });
        reply += `\`\`\`\n\n`;
      } else if (evt.syslogs && evt.syslogs.length > 0) {
        reply += `#### 📄 Syslog Telemetry Logs\n`;
        reply += `\`\`\`\n`;
        evt.syslogs.slice(0, 4).forEach(log => {
          reply += `[${log.level.toUpperCase()}] ${log.msg}\n`;
        });
        reply += `\`\`\`\n\n`;
      }

      reply += `#### 🛠️ Recommended Mitigation Playbook\n`;
      reply += getMitigationPlaybook(evt);

      return reply;
    } else {
      return `I searched your active telemetry event workspace, but I couldn't find any incident matching **${matchStr}**. It might have been deleted, resolved and archived, or the ID is incorrect. Please verify the ID or try searching for another alert in the active event stream.`;
    }
  }

  // 1. Critical / Outages queries
  if (q.includes('critical') || q.includes('outage') || q.includes('criticals') || q.includes('outages') || q.includes('major')) {
    const unresolvedCriticals = dashboardState.events.filter(e => e.severity === 'Critical' && e.status !== 'Resolved');
    const unresolvedMajors = dashboardState.events.filter(e => e.severity === 'Major' && e.status !== 'Resolved');
    
    if (unresolvedCriticals.length === 0 && unresolvedMajors.length === 0) {
      return `Excellent news! I analyzed the current state and found **0 active Critical or Major outages** in progress. All core infrastructure layers report normal operations.`;
    }
    
    let reply = `I identified **${unresolvedCriticals.length + unresolvedMajors.length} active high-severity incidents** in the dashboard:\n\n`;
    
    unresolvedCriticals.forEach(e => {
      reply += `• **[CRITICAL]** **${e.id}** on Host \`${e.host}\`: ${e.summary} (Status: *${e.status}*)\n`;
    });
    unresolvedMajors.forEach(e => {
      reply += `• **[MAJOR]** **${e.id}** on Host \`${e.host}\`: ${e.summary} (Status: *${e.status}*)\n`;
    });
    
    reply += `\nWould you like me to analyze the root cause of any of these incidents? Simply ask me "Why did EVT-XXXX-XXXX trigger?".`;
    return reply;
  }

  // 2. System Health queries
  if (q.includes('health') || q.includes('system health') || q.includes('status') || q.includes('overall')) {
    let health = 100;
    dashboardState.events.forEach(e => {
      if (e.status !== 'Resolved') {
        if (e.severity === 'Critical') health -= 15;
        else if (e.severity === 'Major') health -= 6;
        else if (e.severity === 'Minor') health -= 3;
        else if (e.severity === 'Warning') health -= 1;
      }
    });
    health = Math.max(20, Math.min(100, health));
    
    const activeCount = dashboardState.events.filter(e => e.status !== 'Resolved').length;
    const resolvedCount = dashboardState.events.filter(e => e.status === 'Resolved').length;
    
    let statusClass = "Normal";
    if (health < 70) statusClass = "Degraded State";
    if (health < 50) statusClass = "Critical Stress";
    
    return `### PulseOps Health Diagnostic Report
• **System Health Index**: **${health}%** (${statusClass})
• **Active Unresolved Alerts**: **${activeCount}**
• **Total Archived Logs**: **${dashboardState.events.length}**
• **Resolved Events**: **${resolvedCount}**

*OpsCopilot recommendation:* System performance is currently **${health >= 80 ? 'stable' : 'degraded'}**. Reviewing unresolved critical memory spikes on checkout shard databases is highly recommended to restore peak telemetry metrics.`;
  }

  // 3. Clear/Reset filter action query
  if (q.includes('clear') || q.includes('reset') || q.includes('clean filters')) {
    if (typeof window.clearAllFilters === 'function') {
      window.clearAllFilters();
      return `Done! I have actively **reset all operational dashboard filters** for you. All ${dashboardState.events.length} telemetry event logs are now displayed in your tabular workspace.`;
    }
    return `I see you want to clear filters, but the dashboard's reset utility is currently unreachable.`;
  }

  // 4. Incident resolution instructions (legacy keywords triggers, now falls back to detailed ID lookup if specific ID requested)
  if (q.includes('postgres') || q.includes('db_connections') || q.includes('database') || q.includes('7844')) {
    return `### Recommended Playbook: Active DB Pool Exhaustion (EVT-2026-7844)
This major alert is triggered by active client connection limits (cap: 500) saturation on Host \`rds-postgres-replica-01.db\`.

**Immediate Mitigations:**
1. **Kill Saturation Processes**: Run pg_terminate_backend queries:
\`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';\`
2. **Increase Ingress Limits**: In your microservices ingress gateway, restrict max connection pools to 80 per instance.
3. **Verify Keep-Alives**: Ensure connection timeouts are correctly configured at \`10s\`.

Would you like me to inspect standard host syslogs for PostgreSQL?`;
  }

  if (q.includes('oom') || q.includes('memory') || q.includes('9041')) {
    return `### Recommended Playbook: Node Heap OOM Saturation (EVT-2026-9041)
This critical memory breach (heap > 98%) is due to heap saturation in checkout billing API containers.

**Immediate Mitigations:**
1. **Trigger Container Restart**: Run standard kubectl restart instructions:
\`kubectl rollout restart deployment/checkout-billing-api -n production\`
2. **Scale replicas**: Allocate 2 additional host instances to balance the ingestion threads load:
\`kubectl scale deployment/checkout-billing-api --replicas=5 -n production\`
3. **Check GC saturation**: Inspect Garbage Collection logs. Slope analysis indicates a steady memory leak drift (+2.2MB/min).

Let me know if you would like me to trigger a simulated container restart check!`;
  }

  // 5. Help / General description
  if (q.includes('help') || q.includes('who') || q.includes('what') || q.includes('capabilities')) {
    return `I am **OpsCopilot**, your intelligent operations companion. Here are my capabilities:
1. **Analyze System Health**: Type \`Check overall system health\` to get real-time statistics.
2. **Diagnose Alerts**: Ask \`Are there any active Critical outages?\` to filter out major alert nodes.
3. **Trigger Dashboard Operations**: Tell me to \`clear filters\` and I will reset all searches and severities in real time!
4. **Resolution Playbooks**: Ask \`How do I resolve the memory leak alert?\` to retrieve diagnostics playbooks.`;
  }

  // Default response (fallback)
  return `I received your operational query: "${query}".
I am actively checking the system telemetry for matches. To help me narrow it down, you can:
• Ask **"Show active outages"** to query system severity levels.
• Ask **"Check overall system health"** to calculate health index factors.
• Ask **"How to resolve memory leak?"** to retrieve diagnostics playbooks.`;
}

// --- LIGHTWEIGHT CLIENT-SIDE ML DIAGNOSTICS GENERATOR ---
function getLightweightDiagnostics(evt) {
  let values = [];
  const telemetry = evt.telemetryData || [];
  telemetry.forEach(item => {
    values.push(parseFloat(item.value));
  });
  if (values.length === 0) {
    values = [10, 15, 20, 30, 25, 40];
  }

  const lastVal = values[values.length - 1];
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

  let mean = values.reduce((a, b) => a + b, 0) / values.length;
  let variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  let stdDev = Math.sqrt(variance);

  let confidence = Math.min(99, Math.max(40, Math.floor(70 + (stdDev * 2))));
  let classification = "Anomaly Trend Shift";
  let explanation = `Autopilot detected load variations with an average slope of ${slope.toFixed(2)}/min.`;

  if (evt.chartPattern === 'leak') {
    classification = "System Memory Leakage";
    explanation = "Gradual heap exhaustion drift identified over time steps. Recommended container recycling.";
  } else if (evt.chartPattern === 'spike') {
    classification = "Transient Telemetry Spike";
    explanation = "Sudden transaction threshold saturation detected. Standard ingress queue adjustments recommended.";
  } else if (evt.chartPattern === 'normal') {
    classification = "Static Threshold Saturation";
    explanation = "Persistent resource limit saturation identified on the target host environment.";
  }

  return {
    confidenceScore: confidence,
    classification: classification,
    explanation: explanation,
    slope: parseFloat(slope.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2))
  };
}

// --- CUSTOM RESOLUTION PLAYBOOK DISPATCHER ---
function getMitigationPlaybook(evt) {
  const summary = (evt.summary || '').toLowerCase();
  const desc = (evt.description || '').toLowerCase();
  const id = (evt.id || '').toLowerCase();

  if (id.includes('9041') || summary.includes('oom') || desc.includes('memory') || desc.includes('out of memory')) {
    return `1. **Restart Billing Container**: Trigger standard Kubernetes rollout restart:
\`kubectl rollout restart deployment/checkout-billing-api -n production\`
2. **Horizontal Scaling**: Scale deployment to 5 replicas to balance ingestion load:
\`kubectl scale deployment/checkout-billing-api --replicas=5 -n production\`
3. **Inspect Heap Allocation**: Run heap profile dump checks to locate memory leak origins.`;
  }

  if (id.includes('7844') || summary.includes('postgres') || summary.includes('db_connections') || desc.includes('postgres') || desc.includes('database')) {
    return `1. **Terminate Idle Connections**: Run PostgreSQL pg_terminate_backend command:
\`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';\`
2. **Restrict Gateway Pools**: Set max connection limits to 80 per gateway client worker instance.
3. **Verify Keep-Alives**: Ensure connection timeouts in pool configuration are capped at 10s.`;
  }

  if (id.includes('6122') || summary.includes('ssl') || summary.includes('certificate') || desc.includes('ssl') || desc.includes('expiry')) {
    return `1. **Trigger Renewal Process**: Run ACME client force-renewal CLI commands:
\`sudo certbot renew --force-renewal --nginx\`
2. **Verify Nginx configuration**: Perform syntax verification and reload server:
\`sudo nginx -t && sudo systemctl reload nginx\`
3. **Check Expiration Logs**: Confirm that the renewed files reside in \`/etc/letsencrypt/live/\`.`;
  }

  if (id.includes('4409') || summary.includes('kafka') || summary.includes('partition') || desc.includes('kafka')) {
    return `1. **Verify Partition Replication**: Fetch Kafka cluster replica alignment status:
\`kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions\`
2. **Trigger Replica Reassignment**: Run Kafka reassign command:
\`kafka-reassign-partitions.sh --bootstrap-server localhost:9092 --reassignment-json-file reassign.json --execute\`
3. **Check Network IO Latency**: Inspect packet loss/latency metrics across broker nodes.`;
  }

  if (id.includes('3021') || summary.includes('redis') || summary.includes('eviction') || desc.includes('redis') || desc.includes('lru')) {
    return `1. **Increase Memory Cap**: Adjust Redis maximum allowed volatile capacity in \`redis.conf\`:
\`CONFIG SET maxmemory 4gb\`
2. **Adjust Eviction Rules**: Verify active eviction policy is set to volatile Least Recently Used:
\`CONFIG SET maxmemory-policy volatile-lru\`
3. **Inspect Hot Keys**: Scan for high-frequency keys using \`redis-cli --hotkeys\`.`;
  }

  if (id.includes('1051') || id.includes('1055') || summary.includes('storage') || summary.includes('san') || desc.includes('disk') || desc.includes('latency')) {
    return `1. **Clear Temp Cache Files**: Purge old application log dumps or build artifacts:
\`find /var/log -type f -name "*.log.gz" -delete\`
2. **Throttle Background Ingestion**: Rate limit high-volume Logstash block-device write pipelines.
3. **Check SAN RAID Health**: Verify raid controller queues and disk striping rebuild latency indices.`;
  }

  if (id.includes('1052') || summary.includes('cpu') || summary.includes('throttling') || desc.includes('cpu') || desc.includes('throttle')) {
    return `1. **Increase Container CPU Limits**: Update resource limit configurations in microservice specifications:
\`resources: { limits: { cpu: "2000m" }, requests: { cpu: "1000m" } }\`
2. **Horizontal Autoscaling**: Establish autoscaler guidelines linked to core CPU triggers:
\`kubectl autoscale deployment/gateway-controller --cpu-percent=80 --min=2 --max=10\`
3. **Check Application Thread Locks**: Run CPU profile traces to identify persistent execution loops.`;
  }

  if (id.includes('1053') || summary.includes('nginx') || summary.includes('5xx') || desc.includes('nginx') || desc.includes('upstream')) {
    return `1. **Increase Connection Timeouts**: Set extended upstream timeouts inside Nginx server configuration:
\`proxy_read_timeout 60s; proxy_connect_timeout 60s;\`
2. **Verify Upstream Status**: Check target backend response rates and endpoint latencies.
3. **Reload Web Server Configurations**: Execute Nginx graceful restart:
\`sudo systemctl reload nginx\``;
  }

  if (id.includes('1054') || summary.includes('dns') || summary.includes('coredns') || desc.includes('dns')) {
    return `1. **Clear DNS Daemon Cache**: Restart local name resolution pods:
\`kubectl rollout restart deployment/coredns -n kube-system\`
2. **Increase Resolution Cache TTL**: Set larger timeout capacities in CoreDNS Corefile.
3. **Inspect Upstream Nameservers**: Check route packet latency for configured target forwarders.`;
  }

  // Generic fallback playbook
  return `1. **Inspect Core Telemetry Logs**: Check the logs around the event trigger time for anomalous patterns.
2. **Verify Resource Status**: Confirm network, memory, and CPU limits are within safe operating bounds.
3. **Query Detailed Logs**: run diagnostic commands:
\`journalctl -u ${evt.service.toLowerCase().replace(/\s+/g, '-')} --since "15 minutes ago"\`
4. **Trigger Health Check**: Probe the endpoint health check url:
\`curl -I http://${evt.host || 'localhost'}/health\``;
}
