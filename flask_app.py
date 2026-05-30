import random
from datetime import datetime
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

# Import modular operational database and validation schemas
from database import DATABASE, Event, SyslogEntry

# Import Time-Series ML analysis model
from ml_model import predict_anomaly_and_forecast

# Initialize Flask application
app = Flask(__name__)

# Enable CORS (Cross-Origin Resource Sharing)
CORS(app)

# Helper function to serialize Pydantic model objects to raw dicts
def serialize_event(evt):
    if hasattr(evt, "dict"):
        data = evt.dict()
    else:
        data = dict(evt)
    return data

# --- API ENDPOINTS ---

@app.route('/api/events', methods=['GET'])
def get_events():
    """Retrieve operational events matching optional severity or status parameters."""
    severity = request.args.get('severity')
    status = request.args.get('status')
    
    results = DATABASE
    if severity:
        results = [e for e in results if e.severity.lower() == severity.lower()]
    if status:
        results = [e for e in results if e.status.lower() == status.lower()]
        
    return jsonify([serialize_event(e) for e in results])

@app.route('/api/events/<event_id>', methods=['GET'])
def get_event_by_id(event_id):
    """Retrieve diagnostic details for a specific event ID with on-the-fly ML model forecasts."""
    for e in DATABASE:
        if e.id == event_id:
            # Run time-series ML anomaly classification and forecast model on the fly
            e.mlDiagnostics = predict_anomaly_and_forecast(e.telemetryData, e.chartPattern, e.status, e.threshold)
            return jsonify(serialize_event(e))
    abort(404, description=f"Telemetry incident {event_id} not found in database.")

@app.route('/api/events', methods=['POST'])
def create_event():
    """Simulate injecting an active server/network incident into the telemetry dashboard."""
    req = request.get_json()
    if not req:
        abort(400, description="Invalid or missing JSON payload.")
        
    # Extract fields with schemas fallbacks
    severity = req.get('severity', 'Critical')
    host = req.get('host', 'prod-host.internal')
    summary = req.get('summary', 'CPU core utilization hit limits threshold')
    description = req.get('description', 'Full diagnostic call stack trace details...')
    service = req.get('service', 'API Gateway Routing')
    threshold = req.get('threshold', 'cpu_usage > 95%')
    pattern = req.get('chartPattern', 'spike')
    
    # Generate dynamic EVT ID
    rand_id = random.randint(1000, 9999)
    evt_id = f"EVT-2026-{rand_id}"
    
    # Generate default telemetry timelines
    if pattern == "spike":
        telemetry = [
            {"step": "-45m", "value": 10.0}, {"step": "-40m", "value": 12.0}, {"step": "-35m", "value": 15.0},
            {"step": "-30m", "value": 18.0}, {"step": "-25m", "value": 14.0}, {"step": "-20m", "value": 16.0},
            {"step": "-15m", "value": 92.0}, {"step": "-10m", "value": 94.0}, {"step": "-5m", "value": 96.0},
            {"step": "Trigger", "value": 99.0}
        ]
    elif pattern == "leak":
        telemetry = [
            {"step": "-45m", "value": 20.0}, {"step": "-40m", "value": 30.0}, {"step": "-35m", "value": 40.0},
            {"step": "-30m", "value": 50.0}, {"step": "-25m", "value": 60.0}, {"step": "-20m", "value": 70.0},
            {"step": "-15m", "value": 80.0}, {"step": "-10m", "value": 85.0}, {"step": "-5m", "value": 91.0},
            {"step": "Trigger", "value": 97.0}
        ]
    elif pattern == "steady":
        telemetry = [
            {"step": "-45m", "value": 85.0}, {"step": "-40m", "value": 87.0}, {"step": "-35m", "value": 86.0},
            {"step": "-30m", "value": 88.0}, {"step": "-25m", "value": 87.0}, {"step": "-20m", "value": 88.0},
            {"step": "-15m", "value": 89.0}, {"step": "-10m", "value": 90.0}, {"step": "-5m", "value": 91.0},
            {"step": "Trigger", "value": 93.0}
        ]
    else:
        telemetry = [
            {"step": "-45m", "value": 15.0}, {"step": "-40m", "value": 22.0}, {"step": "-35m", "value": 18.0},
            {"step": "-30m", "value": 25.0}, {"step": "-25m", "value": 30.0}, {"step": "-20m", "value": 24.0},
            {"step": "-15m", "value": 28.0}, {"step": "-10m", "value": 32.0}, {"step": "-5m", "value": 35.0},
            {"step": "Trigger", "value": 40.0}
        ]
        
    date_str = datetime.now().strftime("%H:%M:%S")
    syslogs = [
        {"level": "info", "msg": f"systemd[1]: Initializing metrics logging daemon daemon on {host}..."},
        {"level": "info", "msg": f"daemon[2349]: target parameter set: {threshold}"},
        {"level": "warn", "msg": f"daemon[2349]: [TelemetryWarning] metric surge identified in target partition: {service}"},
        {"level": "warn", "msg": f"daemon[2349]: telemetry timeline is reporting {pattern} pattern constraints"},
        {"level": "error", "msg": f"daemon[2349]: [CRITICAL] System alert triggered: threshold exceeded limit ({threshold})"},
        {"level": "error", "msg": f"syslog: [{date_str}] operational alert dispatched to Control Room center: ID {evt_id}"}
    ]

    new_evt = Event(
        id=evt_id,
        severity=severity,
        host=host,
        summary=summary,
        description=description,
        timestamp=datetime.now().isoformat(),
        status="Active",
        service=service,
        threshold=threshold,
        chartPattern=pattern,
        telemetryData=telemetry,
        historicalAlerts=[
            random.randint(10, 80),
            random.randint(5, 30),
            random.randint(1, 15),
            random.randint(0, 5),
            1 if severity == "Critical" else 0
        ],
        syslogs=syslogs
    )
    
    # Prepend to seed list
    DATABASE.insert(0, new_evt)
    return jsonify(serialize_event(new_evt)), 201

@app.route('/api/events/<event_id>/acknowledge', methods=['POST'])
def acknowledge_event(event_id):
    """Transition incident state to Acknowledged and record transaction time."""
    for e in DATABASE:
        if e.id == event_id:
            if e.status != "Active":
                 abort(400, description=f"Operational alert {event_id} is already in state {e.status}.")
            e.status = "Acknowledged"
            time_str = datetime.now().strftime("%H:%M:%S")
            e.syslogs.append(SyslogEntry(
                level="success",
                msg=f"syslog: [{time_str}] operator acknowledged incident event, MTTA metric halted"
            ))
            return jsonify(serialize_event(e))
    abort(404, description=f"Incident {event_id} not found in telemetry registry.")

@app.route('/api/events/<event_id>/resolve', methods=['POST'])
def resolve_event(event_id):
    """Transition incident state to Resolved, recovering host health metrics."""
    for e in DATABASE:
        if e.id == event_id:
            if e.status == "Resolved":
                abort(400, description=f"Incident {event_id} is already in Resolved state.")
            e.status = "Resolved"
            time_str = datetime.now().strftime("%H:%M:%S")
            e.syslogs.append(SyslogEntry(
                level="success",
                msg=f"syslog: [{time_str}] metric recovery achieved: system telemetry cleared. Alert Resolved."
            ))
            return jsonify(serialize_event(e))
    abort(404, description=f"Incident {event_id} not found in telemetry registry.")

# Run Flask server
if __name__ == '__main__':
    print("PulseOps Flask API server booting on http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=True)
