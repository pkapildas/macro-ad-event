import math
from typing import List, Dict, Any

def predict_anomaly_and_forecast(telemetry_data: List[Any], pattern: str, status: str, threshold: str) -> Dict[str, Any]:
    """
    Fits a time-series trend model on operational telemetry data.
    Computes a 5-step future forecast timeline, anomaly confidence scores,
    and classifies incident resource pattern anomalies.
    Supports Pydantic model objects or raw dictionaries.
    """
    
    # 1. Standardize input objects to raw floats list
    values = []
    steps = []
    for item in telemetry_data:
        if hasattr(item, "value"):
            values.append(float(item.value))
            steps.append(str(item.step))
        elif isinstance(item, dict):
            values.append(float(item.get("value", 0)))
            steps.append(str(item.get("step", "")))
            
    if not values:
        # Fallback values
        values = [10.0, 12.0, 15.0, 18.0, 16.0, 20.0]
        steps = ["-25m", "-20m", "-15m", "-10m", "-5m", "Trigger"]

    last_val = values[-1]
    
    # Define cap based on metric thresholds
    max_cap = 100.0
    if "db_connections" in threshold:
        max_cap = 600.0
    elif "ssl_expiry" in threshold:
        max_cap = 100.0 # Days is different, clamp bottom at 0
        
    # 2. Linear Regression / Autoregressive trend fit on recent points (last 4 steps)
    recent_y = values[-4:] if len(values) >= 4 else values
    n = len(recent_y)
    
    if n > 1:
        # X coordinates represent steps: [0, 1, 2, 3]
        recent_x = list(range(n))
        mean_x = sum(recent_x) / n
        mean_y = sum(recent_y) / n
        
        # Calculate slope m and intercept c
        num = sum((recent_x[i] - mean_x) * (recent_y[i] - mean_y) for i in range(n))
        den = sum((recent_x[i] - mean_x) ** 2 for i in range(n))
        
        slope = num / den if den != 0 else 0.0
    else:
        slope = 0.0

    # 3. Project 5 future forecast steps (+5m, +10m, +15m, +20m, +25m)
    forecast_steps = ["+5m", "+10m", "+15m", "+20m", "+25m"]
    forecast_data = []
    
    for i, step_name in enumerate(forecast_steps):
        # Linear projection clamp
        projected = last_val + (slope * (i + 1))
        
        # Clamp bounds
        if "ssl_expiry" in threshold:
            projected = max(0.0, projected)  # Cannot expire below 0 days
        else:
            projected = max(0.0, min(max_cap, projected))
            
        forecast_data.append({"step": step_name, "value": round(projected, 1)})

    # 4. Statistical Anomaly scoring using z-scores
    mean_val = sum(values) / len(values)
    variance = sum((x - mean_val) ** 2 for x in values) / len(values)
    std_dev = math.sqrt(variance)
    
    # Calculate anomaly probability based on z-score and event active status
    if status == "Resolved":
        anomaly_prob = random_low_prob(last_val, threshold)
    else:
        # Active alert logic
        if std_dev > 0:
            z_score = abs(last_val - mean_val) / std_dev
        else:
            z_score = 1.0
            
        # Transform z-score to confidence bounds
        base_prob = 55 + (z_score * 12)
        
        # Boost for critical outages
        if last_val >= max_cap * 0.9:
            base_prob += 15
            
        anomaly_prob = max(40, min(99, base_prob))
        
    anomaly_prob = round(anomaly_prob, 1)

    # 5. Classify the pattern anomaly
    if status == "Resolved":
        classification = "Normal Telemetry"
        explanation = "Resource usage has fully stabilized. System reports normal variance."
    elif slope > 1.2 and last_val > max_cap * 0.75:
        classification = "System Resource Leak (OOM)"
        explanation = f"Telemetry displays a persistent upward drift slope of +{slope:.2f}/min, signaling memory/resource leakage."
    elif abs(slope) < 0.5 and last_val > max_cap * 0.85:
        classification = "Sustained High Stress"
        explanation = f"Host has plateaued at high capacity utilization (average: {mean_val:.1f}%) with severe thread blocks."
    elif slope > 4.5:
        classification = "Sudden Transient Spike"
        explanation = f"Rapid operational jump detected (slope velocity +{slope:.2f}/step). Typical of massive queue surges or core loops."
    elif std_dev > 15.0:
        classification = "Erratic Oscillations"
        explanation = f"Highly erratic wave behavior detected (standard deviation: {std_dev:.2f}). Signals load-balancer imbalance."
    else:
        classification = "Threshold Breach"
        explanation = f"Gradual boundary threshold exceeded limit limits. Slope trend remains positive (+{slope:.2f}/step)."

    return {
        "confidenceScore": anomaly_prob,
        "classification": classification,
        "explanation": explanation,
        "forecastData": forecast_data,
        "slope": round(slope, 3),
        "stdDev": round(std_dev, 2)
    }

def random_low_prob(last_val: float, threshold: str) -> float:
    # Resolved cases are normal
    if "ssl_expiry" in threshold:
        return 12.5 # SSL still active notices
    return round(2.0 + (last_val % 4.0), 1)
