import requests
import json

images = [
    ("1_active_iron_ore_mine.png", "Active Iron Ore Mine"),
    ("2_dense_forest_no_mining.png", "Dense Forest (No Mining)"),
    ("3_illegal_sand_mining_river.png", "Illegal Sand Mining"),
    ("4_mixed_forest_quarry.png", "Mixed Forest + Quarry"),
]

for filename, label in images:
    path = f"sample_images/{filename}"
    r = requests.post(
        'http://localhost:5000/api/analyze',
        files={'image': open(path, 'rb')}
    )
    d = r.json()
    s = d['summary']
    idx = d['spectral_indices']
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Disturbances: {s['total_disturbances']}")
    print(f"  Illegal:      {s['illegal_count']}  |  Legal: {s['legal_count']}")
    print(f"  Risk Score:   {s['overall_risk_score']*100:.1f}%")
    print(f"  NDVI:         {idx['ndvi']:.4f}")
    print(f"  BSI:          {idx['bsi']:.4f}")
    print(f"  Soil Index:   {idx['soil_index']:.4f}")
    print(f"  Veg Ratio:    {idx['vegetation_ratio']:.4f}")
    print(f"  Processing:   {d['processing_time_seconds']:.2f}s")
