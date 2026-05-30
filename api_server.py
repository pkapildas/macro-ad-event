import os
import sys
import numpy as np
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

# Try importing scientific libraries and XGBoost
try:
    import xgboost as xgb
except ImportError:
    print("\n[!] Warning: XGBoost is required to run this API server.")
    print("    Please install it by executing:")
    print("    pip install xgboost flask flask-cors numpy\n")
    sys.exit(1)

# Initialize Flask application
app = Flask(__name__)

# Enable CORS (Cross-Origin Resource Sharing)
CORS(app)

# Path to the serialized pre-trained XGBoost model
MODEL_PATH = "telemetry_model.pkl"

# Load the pre-trained model ONCE when the API server boots up
if not os.path.exists(MODEL_PATH):
    print(f"\n[!] Error: Pre-trained model file '{MODEL_PATH}' was not found.")
    print("    Please train the model first by running:")
    print("    python3 xgboost_rcf_forecast.py\n")
    sys.exit(1)

# Deserialize the pre-trained model using Pickle
import pickle
with open(MODEL_PATH, 'rb') as f:
    model = pickle.load(f)
print(f"[*] Production MLOps: Pre-trained XGBoost model '{MODEL_PATH}' loaded successfully via Pickle!")

# --- MULTI-STEP RECURSIVE FORECASTING (RCF) UTILITY ---
def run_recursive_forecast(loaded_model, seed_window, steps=5):
    """
    Performs Recursive Multi-Step Forecasting (RCF).
    Uses the model's own predictions recursively to slide the lag window.
    """
    forecast_results = []
    current_window = list(seed_window)
    
    for i in range(steps):
        # Format lag features: lag_1 (t), lag_2 (t-1), lag_3 (t-2), etc.
        features = np.array([
            current_window[-1], 
            current_window[-2], 
            current_window[-3], 
            current_window[-4], 
            current_window[-5]
        ]).reshape(1, -1)
        
        # Make instant real-time prediction
        pred = loaded_model.predict(features)[0]
        pred = max(0.0, min(100.0, float(pred)))
        forecast_results.append(round(pred, 2))
        
        # Append prediction to slide the window recursively
        current_window.append(pred)
        current_window.pop(0)
        
    return forecast_results

# --- API ENDPOINTS ---

@app.route('/api/predict', methods=['POST'])
def predict_telemetry():
    """
    Exposes real-time multi-step forecasting for server telemetry.
    Expects a JSON payload: { "lags": [val_t-4, val_t-3, val_t-2, val_t-1, val_t] }
    Returns a 5-step recursive future load forecast list.
    """
    req = request.get_json()
    if not req or 'lags' not in req:
        abort(400, description="Invalid payload: JSON body must contain 'lags' list of 5 coordinates.")
        
    lags = req['lags']
    if not isinstance(lags, list) or len(lags) != 5:
        abort(400, description="Invalid parameters: 'lags' must be a list containing exactly 5 numerical values.")
        
    try:
        # Convert values to standard floats
        seed_window = [float(x) for x in lags]
    except ValueError:
        abort(400, description="Invalid parameters: all lag coordinates must be valid numbers.")
        
    # Generate 5-step recursive predictions
    print(f"[*] Production Inference: Received seed lags window {seed_window}")
    forecast = run_recursive_forecast(model, seed_window, steps=5)
    print(f"[*] Production Inference: Generated 5-step recursive forecast {forecast}")
    
    # Map predictions to operational steps (+5m to +25m)
    forecast_steps = ["+5m", "+10m", "+15m", "+20m", "+25m"]
    forecast_data = [{"step": forecast_steps[i], "value": forecast[i]} for i in range(len(forecast_steps))]
    
    return jsonify({
        "status": "success",
        "model_type": "XGBoost Gradient Boosting Regressor",
        "seed_window": seed_window,
        "forecast": forecast,
        "forecast_data": forecast_data
    })

# Run the Flask API Server
if __name__ == '__main__':
    # Serve XGBoost predictions on port 8002
    print("XGBoost MLOps API server booting on http://localhost:8002")
    app.run(host='0.0.0.0', port=8002, debug=True)
