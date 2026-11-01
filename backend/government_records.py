"""
Government Records Module for Illegal Mining Detection System.
Provides synthetic but geographically accurate mining lease records 
for cross-referencing detected mining activities against official government data.
Modeled after India's Mining Surveillance System (MSS) and IBM records.
"""
import math
import json
import os

# Official Mining Lease Records (Synthetic data based on real Indian mining regions)
MINING_LEASES = [
    {
        "lease_id": "ML/KA/BLY/2019/001",
        "company": "Bellary Iron Ores Ltd.",
        "mineral": "Iron Ore",
        "latitude": 15.1394,
        "longitude": 76.9214,
        "area_sqkm": 2.5,
        "radius_km": 0.89,
        "district": "Bellary",
        "state": "Karnataka",
        "status": "Active",
        "valid_from": "2019-04-01",
        "valid_until": "2039-03-31",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/KA/BLY/2015/002",
        "company": "NMDC Ltd.",
        "mineral": "Iron Ore",
        "latitude": 15.0830,
        "longitude": 76.5700,
        "area_sqkm": 5.0,
        "radius_km": 1.26,
        "district": "Bellary",
        "state": "Karnataka",
        "status": "Active",
        "valid_from": "2015-06-15",
        "valid_until": "2045-06-14",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/GOA/SG/2018/003",
        "company": "Sesa Goa Iron Ore",
        "mineral": "Iron Ore",
        "latitude": 15.3800,
        "longitude": 74.0200,
        "area_sqkm": 1.8,
        "radius_km": 0.76,
        "district": "South Goa",
        "state": "Goa",
        "status": "Suspended",
        "valid_from": "2018-01-10",
        "valid_until": "2048-01-09",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/JH/DHN/2020/004",
        "company": "Central Coalfields Ltd.",
        "mineral": "Coal",
        "latitude": 23.7500,
        "longitude": 86.4200,
        "area_sqkm": 8.0,
        "radius_km": 1.60,
        "district": "Dhanbad",
        "state": "Jharkhand",
        "status": "Active",
        "valid_from": "2020-03-01",
        "valid_until": "2050-02-28",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/OD/KJR/2017/005",
        "company": "Tata Steel Mining Ltd.",
        "mineral": "Iron Ore",
        "latitude": 22.0200,
        "longitude": 85.5800,
        "area_sqkm": 4.2,
        "radius_km": 1.16,
        "district": "Keonjhar",
        "state": "Odisha",
        "status": "Active",
        "valid_from": "2017-09-20",
        "valid_until": "2047-09-19",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/RJ/UDP/2016/006",
        "company": "Rajasthan State Mines & Minerals",
        "mineral": "Marble",
        "latitude": 24.5700,
        "longitude": 73.7000,
        "area_sqkm": 1.2,
        "radius_km": 0.62,
        "district": "Udaipur",
        "state": "Rajasthan",
        "status": "Active",
        "valid_from": "2016-07-01",
        "valid_until": "2036-06-30",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/CG/RPR/2019/007",
        "company": "Chhattisgarh Mineral Development Corp.",
        "mineral": "Limestone",
        "latitude": 21.2800,
        "longitude": 81.6500,
        "area_sqkm": 3.5,
        "radius_km": 1.06,
        "district": "Raipur",
        "state": "Chhattisgarh",
        "status": "Active",
        "valid_from": "2019-11-15",
        "valid_until": "2049-11-14",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/OD/ANG/2018/008",
        "company": "Mahanadi Coalfields Ltd.",
        "mineral": "Coal",
        "latitude": 20.9500,
        "longitude": 85.1000,
        "area_sqkm": 6.0,
        "radius_km": 1.38,
        "district": "Angul",
        "state": "Odisha",
        "status": "Active",
        "valid_from": "2018-05-01",
        "valid_until": "2048-04-30",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/AP/KNL/2020/009",
        "company": "AP Mineral Development Corp.",
        "mineral": "Granite",
        "latitude": 15.8400,
        "longitude": 78.0500,
        "area_sqkm": 0.8,
        "radius_km": 0.50,
        "district": "Kurnool",
        "state": "Andhra Pradesh",
        "status": "Expired",
        "valid_from": "2020-02-01",
        "valid_until": "2025-01-31",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/MH/NGP/2017/010",
        "company": "MOIL Ltd.",
        "mineral": "Manganese",
        "latitude": 21.1500,
        "longitude": 79.1000,
        "area_sqkm": 3.0,
        "radius_km": 0.98,
        "district": "Nagpur",
        "state": "Maharashtra",
        "status": "Active",
        "valid_from": "2017-01-10",
        "valid_until": "2047-01-09",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/RJ/JPR/2021/011",
        "company": "Rajasthan Marble Mining Co.",
        "mineral": "Marble",
        "latitude": 26.8500,
        "longitude": 75.7700,
        "area_sqkm": 0.6,
        "radius_km": 0.44,
        "district": "Jaipur",
        "state": "Rajasthan",
        "status": "Active",
        "valid_from": "2021-04-01",
        "valid_until": "2041-03-31",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/JH/RAN/2019/012",
        "company": "Hindustan Copper Ltd.",
        "mineral": "Mica",
        "latitude": 23.6200,
        "longitude": 85.3000,
        "area_sqkm": 1.5,
        "radius_km": 0.69,
        "district": "Ranchi",
        "state": "Jharkhand",
        "status": "Expired",
        "valid_from": "2019-08-01",
        "valid_until": "2024-07-31",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/TS/HYD/2022/013",
        "company": "Telangana State Mineral Development Corp.",
        "mineral": "Granite",
        "latitude": 17.3900,
        "longitude": 78.5000,
        "area_sqkm": 1.0,
        "radius_km": 0.56,
        "district": "Hyderabad",
        "state": "Telangana",
        "status": "Active",
        "valid_from": "2022-01-15",
        "valid_until": "2042-01-14",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/TN/CBE/2020/014",
        "company": "Tamil Nadu Minerals Ltd.",
        "mineral": "Granite",
        "latitude": 11.0200,
        "longitude": 76.9700,
        "area_sqkm": 0.5,
        "radius_km": 0.40,
        "district": "Coimbatore",
        "state": "Tamil Nadu",
        "status": "Expired",
        "valid_from": "2020-06-01",
        "valid_until": "2024-05-31",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/KL/PKD/2018/015",
        "company": "Kerala Minerals and Metals Ltd.",
        "mineral": "Granite",
        "latitude": 10.8600,
        "longitude": 76.2800,
        "area_sqkm": 0.4,
        "radius_km": 0.36,
        "district": "Palakkad",
        "state": "Kerala",
        "status": "Suspended",
        "valid_from": "2018-10-01",
        "valid_until": "2038-09-30",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/MP/IND/2019/016",
        "company": "MP State Mining Corp.",
        "mineral": "Sand",
        "latitude": 22.7300,
        "longitude": 75.8700,
        "area_sqkm": 0.3,
        "radius_km": 0.31,
        "district": "Indore",
        "state": "Madhya Pradesh",
        "status": "Expired",
        "valid_from": "2019-03-01",
        "valid_until": "2024-02-28",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/AP/ATP/2021/017",
        "company": "Singareni Collieries Co.",
        "mineral": "Iron Ore",
        "latitude": 14.6900,
        "longitude": 77.6100,
        "area_sqkm": 2.0,
        "radius_km": 0.80,
        "district": "Anantapur",
        "state": "Andhra Pradesh",
        "status": "Active",
        "valid_from": "2021-08-01",
        "valid_until": "2051-07-31",
        "category": "Major Mineral"
    },
    {
        "lease_id": "ML/RJ/AJM/2020/018",
        "company": "Rajasthan Feldspar Mining Corp.",
        "mineral": "Feldspar",
        "latitude": 26.4600,
        "longitude": 74.6500,
        "area_sqkm": 0.7,
        "radius_km": 0.47,
        "district": "Ajmer",
        "state": "Rajasthan",
        "status": "Active",
        "valid_from": "2020-12-01",
        "valid_until": "2040-11-30",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/GJ/VAD/2017/019",
        "company": "Gujarat Mineral Development Corp.",
        "mineral": "Sand",
        "latitude": 22.3100,
        "longitude": 73.1900,
        "area_sqkm": 1.5,
        "radius_km": 0.69,
        "district": "Vadodara",
        "state": "Gujarat",
        "status": "Active",
        "valid_from": "2017-05-15",
        "valid_until": "2037-05-14",
        "category": "Minor Mineral"
    },
    {
        "lease_id": "ML/MH/AUR/2022/020",
        "company": "Maharashtra Mineral Corp.",
        "mineral": "Bauxite",
        "latitude": 19.8800,
        "longitude": 75.3500,
        "area_sqkm": 2.2,
        "radius_km": 0.84,
        "district": "Aurangabad",
        "state": "Maharashtra",
        "status": "Active",
        "valid_from": "2022-06-01",
        "valid_until": "2052-05-31",
        "category": "Major Mineral"
    }
]

# Load protected zones
PROTECTED_ZONES = []
data_dir = os.path.join(os.path.dirname(__file__), 'data')
pz_path = os.path.join(data_dir, 'protected_zones.json')
if os.path.exists(pz_path):
    with open(pz_path, 'r') as f:
        PROTECTED_ZONES = json.load(f)


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance in kilometers between two points."""
    R = 6371  # Radius of Earth in km
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def cross_reference_location(lat, lng):
    """
    Cross-reference a detected mining location against official government records.
    Returns classification (Legal/Illegal) and details.
    """
    result = {
        "classification": "Illegal",
        "confidence": 0.0,
        "nearest_lease": None,
        "distance_to_nearest_km": float('inf'),
        "in_active_lease": False,
        "in_protected_zone": False,
        "protected_zone_name": None,
        "details": ""
    }

    # Check against all mining leases
    nearest_lease = None
    min_distance = float('inf')

    for lease in MINING_LEASES:
        distance = haversine_distance(lat, lng, lease['latitude'], lease['longitude'])

        if distance < min_distance:
            min_distance = distance
            nearest_lease = lease

        # Check if within lease radius
        if distance <= lease['radius_km']:
            if lease['status'] == 'Active':
                result['classification'] = 'Legal'
                result['confidence'] = max(0.85, 1.0 - (distance / lease['radius_km']) * 0.15)
                result['in_active_lease'] = True
                result['details'] = (
                    f"Location falls within active mining lease {lease['lease_id']} "
                    f"held by {lease['company']} for {lease['mineral']} mining. "
                    f"Lease valid until {lease['valid_until']}."
                )
            elif lease['status'] == 'Expired':
                result['classification'] = 'Illegal'
                result['confidence'] = 0.90
                result['details'] = (
                    f"Location falls within EXPIRED mining lease {lease['lease_id']}. "
                    f"Lease held by {lease['company']} expired on {lease['valid_until']}. "
                    f"Mining activity after expiry is ILLEGAL."
                )
            elif lease['status'] == 'Suspended':
                result['classification'] = 'Illegal'
                result['confidence'] = 0.95
                result['details'] = (
                    f"Location falls within SUSPENDED mining lease {lease['lease_id']}. "
                    f"Lease held by {lease['company']} is currently suspended by government order. "
                    f"Any mining activity is ILLEGAL."
                )
            break

    result['nearest_lease'] = nearest_lease
    result['distance_to_nearest_km'] = round(min_distance, 2)

    # If not within any lease boundary
    if not result['in_active_lease'] and result['classification'] == 'Illegal':
        if nearest_lease:
            result['confidence'] = min(0.98, 0.7 + min_distance / 100)
            result['details'] = (
                f"No valid mining lease found for this location. "
                f"Nearest lease is {nearest_lease['lease_id']} ({nearest_lease['company']}) "
                f"at {min_distance:.1f} km distance. "
                f"Mining without a valid lease is ILLEGAL under MMDR Act, 1957."
            )

    # Check protected zones
    for zone in PROTECTED_ZONES:
        dist_to_zone = haversine_distance(lat, lng, zone['center_lat'], zone['center_lng'])
        if dist_to_zone <= zone['radius_km']:
            result['in_protected_zone'] = True
            result['protected_zone_name'] = zone['name']
            result['classification'] = 'Illegal'
            result['confidence'] = 0.99
            result['details'] += (
                f" CRITICAL: Location is within {zone['name']} ({zone['type']}), "
                f"a designated No Mining Zone under notification {zone['gazette_notification']}."
            )
            break

    return result


def get_all_leases():
    """Return all mining leases."""
    return MINING_LEASES


def get_all_protected_zones():
    """Return all protected zones."""
    return PROTECTED_ZONES


def get_nearby_incidents(lat, lng, radius_km=50):
    """Get historical incidents near a location."""
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    incidents_path = os.path.join(data_dir, 'historical_incidents.json')

    if not os.path.exists(incidents_path):
        return []

    with open(incidents_path, 'r') as f:
        all_incidents = json.load(f)

    nearby = []
    for inc in all_incidents:
        dist = haversine_distance(lat, lng, inc['latitude'], inc['longitude'])
        if dist <= radius_km:
            inc['distance_km'] = round(dist, 2)
            nearby.append(inc)

    return sorted(nearby, key=lambda x: x['distance_km'])
