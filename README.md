# Illegal Mining Detection & Monitoring System

An automated satellite imagery analysis and legal compliance checking platform to detect, classify, and report illegal mining activities.

## Features

- **Automated Disturbance Detection**: Uses machine learning to detect mining disturbances and quantify excavated areas.
- **Hyperspectral & Multi-spectral Analysis**: Evaluates spectral signatures and mineral characteristics.
- **Compliance & Protected Zones**: Cross-references coordinates with government lease records, forest areas, and wildlife sanctuaries.
- **Interactive Geospatial Dashboard**: Interactive maps, incident reporting, and real-time alerts.

## Project Structure

```text
├── backend/
│   ├── data/                 # Protected zones & historical incident databases
│   ├── app.py                # Flask API server
│   ├── database.py           # SQLite database interface
│   ├── government_records.py # Lease and boundary validation
│   ├── ml_model.py           # ML analysis and computer vision processing
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── index.html            # Main dashboard interface
│   ├── index.css             # UI styling
│   └── app.js                # Frontend client logic & map integration
├── sample_images/            # Sample satellite & aerial test images
└── test_api.py               # API testing script
```

## Quick Start

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows PowerShell: .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```bash
   python app.py
   ```

### Frontend Setup
Open `frontend/index.html` in your web browser or serve it using any static HTTP server.
