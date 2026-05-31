import random
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Import modular operational database and validation schemas
from database import Event, CreateEventRequest, DATABASE, SyslogEntry

# Import Time-Series ML analysis model
from ml_model import predict_anomaly_and_forecast

# Initialize modular FastAPI application
app = FastAPI(
    title="PulseOps API Server",
    description="Operational Telemetry & Incident Control Room API (Modular)",
    version="1.1.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local prototype integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API ENDPOINTS ---

@app.get("/api/events", response_model=List[Event])
def get_events(
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    status: Optional[str] = Query(None, description="Filter by status (Active, Acknowledged, Resolved)")
):
    """Retrieve operational events matching optional severity or status parameters."""
    results = DATABASE
    if severity:
        results = [e for e in results if e.severity.lower() == severity.lower()]
    if status:
        results = [e for e in results if e.status.lower() == status.lower()]
    return results

@app.get("/api/events/{event_id}", response_model=Event)
def get_event_by_id(event_id: str):
    """Retrieve diagnostic details for a specific event ID."""
    for e in DATABASE:
        if e.id == event_id:
            # Run time-series ML anomaly classification and forecast model on the fly
            e.mlDiagnostics = predict_anomaly_and_forecast(e.telemetryData, e.chartPattern, e.status, e.threshold)
            return e
    raise HTTPException(status_code=404, detail=f"Telemetry incident {event_id} not found in database.")

@app.post("/api/events", response_model=Event)
def create_event(req: CreateEventRequest):
    """Simulate injecting an active server/network incident into the telemetry dashboard."""
    # Generate dynamic EVT ID
    rand_id = random.randint(1000, 9999)
    evt_id = f"EVT-2026-{rand_id}"
    
    # Generate default telemetry timelines
    if req.chartPattern == "spike":
        telemetry = [
            {"step": "-45m", "value": 10.0}, {"step": "-40m", "value": 12.0}, {"step": "-35m", "value": 15.0},
            {"step": "-30m", "value": 18.0}, {"step": "-25m", "value": 14.0}, {"step": "-20m", "value": 16.0},
            {"step": "-15m", "value": 92.0}, {"step": "-10m", "value": 94.0}, {"step": "-5m", "value": 96.0},
            {"step": "Trigger", "value": 99.0}
        ]
    elif req.chartPattern == "leak":
        telemetry = [
            {"step": "-45m", "value": 20.0}, {"step": "-40m", "value": 30.0}, {"step": "-35m", "value": 40.0},
            {"step": "-30m", "value": 50.0}, {"step": "-25m", "value": 60.0}, {"step": "-20m", "value": 70.0},
            {"step": "-15m", "value": 80.0}, {"step": "-10m", "value": 85.0}, {"step": "-5m", "value": 91.0},
            {"step": "Trigger", "value": 97.0}
        ]
    elif req.chartPattern == "steady":
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
        {"level": "info", "msg": f"systemd[1]: Initializing metrics logging daemon daemon on {req.host}..."},
        {"level": "info", "msg": f"daemon[2349]: target parameter set: {req.threshold}"},
        {"level": "warn", "msg": f"daemon[2349]: [TelemetryWarning] metric surge identified in target partition: {req.service}"},
        {"level": "warn", "msg": f"daemon[2349]: telemetry timeline is reporting {req.chartPattern} pattern constraints"},
        {"level": "error", "msg": f"daemon[2349]: [CRITICAL] System alert triggered: threshold exceeded limit ({req.threshold})"},
        {"level": "error", "msg": f"syslog: [{date_str}] operational alert dispatched to Control Room center: ID {evt_id}"}
    ]

    new_evt = Event(
        id=evt_id,
        severity=req.severity,
        host=req.host,
        summary=req.summary,
        description=req.description,
        timestamp=datetime.now().isoformat(),
        status="Active",
        service=req.service,
        threshold=req.threshold,
        chartPattern=req.chartPattern,
        telemetryData=telemetry,
        historicalAlerts=[
            random.randint(10, 80),
            random.randint(5, 30),
            random.randint(1, 15),
            random.randint(0, 5),
            1 if req.severity == "Critical" else 0
        ],
        syslogs=syslogs
    )
    
    # Prepend to the database list
    DATABASE.insert(0, new_evt)
    return new_evt

@app.post("/api/events/{event_id}/acknowledge", response_model=Event)
def acknowledge_event(event_id: str):
    """Transition incident state to Acknowledged and record transaction time."""
    for e in DATABASE:
        if e.id == event_id:
            if e.status != "Active":
                 raise HTTPException(status_code=400, detail=f"Operational alert {event_id} is already in state {e.status}.")
            e.status = "Acknowledged"
            time_str = datetime.now().strftime("%H:%M:%S")
            e.syslogs.append(SyslogEntry(
                level="success",
                msg=f"syslog: [{time_str}] operator acknowledged incident event, MTTA metric halted"
            ))
            return e
    raise HTTPException(status_code=404, detail=f"Incident {event_id} not found in telemetry registry.")

@app.post("/api/events/{event_id}/resolve", response_model=Event)
def resolve_event(event_id: str):
    """Transition incident state to Resolved, recovering host health metrics."""
    for e in DATABASE:
        if e.id == event_id:
            if e.status == "Resolved":
                raise HTTPException(status_code=400, detail=f"Incident {event_id} is already in Resolved state.")
            e.status = "Resolved"
            time_str = datetime.now().strftime("%H:%M:%S")
            e.syslogs.append(SyslogEntry(
                level="success",
                msg=f"syslog: [{time_str}] metric recovery achieved: system telemetry cleared. Alert Resolved."
            ))
            return e
    raise HTTPException(status_code=404, detail=f"Incident {event_id} not found in telemetry registry.")

@app.delete("/api/events/{event_id}")
def delete_event(event_id: str):
    """Delete an operational event from the database registry."""
    for idx, e in enumerate(DATABASE):
        if e.id == event_id:
            DATABASE.pop(idx)
            return {"status": "success", "message": f"Incident {event_id} successfully deleted from registry."}
    raise HTTPException(status_code=404, detail=f"Incident {event_id} not found in telemetry registry.")
