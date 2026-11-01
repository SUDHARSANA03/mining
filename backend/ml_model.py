"""
ML Model Module for Illegal Mining Detection System.
Implements change detection using image processing and a Random Forest classifier
to identify surface disturbances indicative of illegal mining activity.
"""
import numpy as np
import cv2
from PIL import Image
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from scipy import ndimage
import io
import random
import math
import pickle
import os

# Seed for reproducibility
np.random.seed(42)
random.seed(42)


class MiningDetectionModel:
    """ML model for detecting illegal mining activity from satellite imagery."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self._train_model()

    def _train_model(self):
        """Train a Random Forest model on synthetic feature vectors."""
        # Generate synthetic training data simulating spectral features
        n_samples = 2000

        # Features: [ndvi, bsi, ndwi, texture_entropy, edge_density,
        #            red_mean, green_mean, blue_mean, brightness,
        #            color_variance, soil_index, vegetation_ratio]
        X = []
        y = []

        # Class 0: Dense vegetation (no mining) — low disturbance probability
        for _ in range(500):
            X.append([
                np.random.uniform(0.6, 0.9),     # high NDVI
                np.random.uniform(0.05, 0.2),     # low BSI
                np.random.uniform(0.3, 0.6),      # moderate water
                np.random.uniform(4.0, 6.0),       # moderate texture
                np.random.uniform(0.05, 0.15),    # low edge density
                np.random.uniform(30, 80),         # low red
                np.random.uniform(80, 160),        # high green
                np.random.uniform(20, 60),         # low blue
                np.random.uniform(50, 100),        # low brightness
                np.random.uniform(10, 40),         # low variance
                np.random.uniform(0.05, 0.2),     # low soil
                np.random.uniform(0.6, 0.9),      # high vegetation
            ])
            y.append(0)

        # Class 1: Agricultural land — low probability
        for _ in range(300):
            X.append([
                np.random.uniform(0.3, 0.6),
                np.random.uniform(0.15, 0.35),
                np.random.uniform(0.1, 0.4),
                np.random.uniform(3.0, 5.5),
                np.random.uniform(0.1, 0.25),
                np.random.uniform(80, 140),
                np.random.uniform(100, 170),
                np.random.uniform(40, 80),
                np.random.uniform(80, 140),
                np.random.uniform(20, 60),
                np.random.uniform(0.15, 0.4),
                np.random.uniform(0.3, 0.6),
            ])
            y.append(0)

        # Class 2: Urban/built-up — moderate probability
        for _ in range(200):
            X.append([
                np.random.uniform(0.05, 0.25),
                np.random.uniform(0.3, 0.6),
                np.random.uniform(0.0, 0.2),
                np.random.uniform(5.0, 7.5),
                np.random.uniform(0.2, 0.45),
                np.random.uniform(120, 180),
                np.random.uniform(110, 170),
                np.random.uniform(100, 160),
                np.random.uniform(120, 180),
                np.random.uniform(30, 70),
                np.random.uniform(0.3, 0.6),
                np.random.uniform(0.05, 0.25),
            ])
            y.append(0)

        # Class 3: Active mining / excavation — HIGH probability
        for _ in range(500):
            X.append([
                np.random.uniform(-0.25, 0.1),    # very low/negative NDVI
                np.random.uniform(0.25, 0.95),    # high BSI (bare soil)
                np.random.uniform(-0.2, 0.2),     # low water
                np.random.uniform(5.0, 9.0),      # high texture (rough terrain)
                np.random.uniform(0.05, 0.7),     # variable edge density
                np.random.uniform(80, 220),        # variable red (exposed earth)
                np.random.uniform(60, 160),        # variable green
                np.random.uniform(40, 140),        # variable blue
                np.random.uniform(70, 200),        # variable brightness
                np.random.uniform(20, 120),        # variable variance
                np.random.uniform(0.0, 0.95),     # variable soil index
                np.random.uniform(0.2, 0.38),     # low vegetation ratio
            ])
            y.append(1)

        # Class 4: Recent disturbance / cleared land — HIGH probability
        for _ in range(500):
            X.append([
                np.random.uniform(-0.22, 0.15),
                np.random.uniform(0.2, 0.85),
                np.random.uniform(-0.1, 0.2),
                np.random.uniform(4.5, 8.5),
                np.random.uniform(0.05, 0.6),
                np.random.uniform(70, 210),
                np.random.uniform(50, 175),
                np.random.uniform(40, 150),
                np.random.uniform(60, 190),
                np.random.uniform(15, 100),
                np.random.uniform(-0.05, 0.85),
                np.random.uniform(0.22, 0.38),
            ])
            y.append(1)

        X = np.array(X)
        y = np.array(y)

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Train Random Forest (optimized for fast startup)
        self.model = RandomForestClassifier(
            n_estimators=50,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled, y)

    def extract_features(self, image):
        """Extract spectral and texture features from an image."""
        if isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            img_array = image

        # Ensure RGB
        if len(img_array.shape) == 2:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif img_array.shape[2] == 4:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

        # Convert to float
        img_float = img_array.astype(np.float64)
        r, g, b = img_float[:,:,0], img_float[:,:,1], img_float[:,:,2]

        # 1. Simulated NDVI (using Red and Green channels as proxy)
        ndvi = np.where(
            (g + r) > 0,
            (g - r) / (g + r + 1e-10),
            0
        )
        ndvi_mean = np.mean(ndvi)

        # 2. Bare Soil Index (BSI)
        bsi = np.where(
            (r + g + b) > 0,
            ((r + b) - g) / (r + g + b + 1e-10),
            0
        )
        bsi_mean = np.mean(bsi)

        # 3. Normalized Difference Water Index (NDWI) simulation
        ndwi = np.where(
            (g + b) > 0,
            (g - b) / (g + b + 1e-10),
            0
        )
        ndwi_mean = np.mean(ndwi)

        # 4. Texture entropy (grayscale)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        # Use local entropy via histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        hist = hist / hist.sum()
        entropy = -np.sum(hist[hist > 0] * np.log2(hist[hist > 0]))

        # 5. Edge density (Canny edges)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        # 6. Channel means
        red_mean = np.mean(r)
        green_mean = np.mean(g)
        blue_mean = np.mean(b)

        # 7. Brightness
        brightness = np.mean(img_float)

        # 8. Color variance
        color_variance = np.var(img_float)

        # 9. Soil index (redness-based)
        soil_index = np.mean(np.where(
            (r + g) > 0,
            (r - g) / (r + g + 1e-10),
            0
        ))

        # 10. Vegetation ratio
        total = r + g + b + 1e-10
        veg_ratio = np.mean(g / total)

        features = [
            float(ndvi_mean), float(bsi_mean), float(ndwi_mean), float(entropy), float(edge_density),
            float(red_mean), float(green_mean), float(blue_mean), float(brightness),
            float(color_variance), float(soil_index), float(veg_ratio)
        ]

        return features

    def analyze_image(self, image_bytes):
        """
        Analyze a satellite image for mining activity.
        Returns detected disturbances with probability scores.
        """
        # Load image
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # Resize large images for faster processing (keep aspect ratio)
        max_dim = 800
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)

        img_array = np.array(img)
        h, w = img_array.shape[:2]

        # Divide image into grid cells for spatial analysis
        cell_size = min(h, w) // 6
        if cell_size < 20:
            cell_size = min(h, w) // 3
        if cell_size < 10:
            cell_size = max(h, w)

        disturbances = []
        all_features = []
        cell_positions = []

        rows = max(1, h // cell_size)
        cols = max(1, w // cell_size)

        for i in range(rows):
            for j in range(cols):
                y1 = i * cell_size
                y2 = min((i + 1) * cell_size, h)
                x1 = j * cell_size
                x2 = min((j + 1) * cell_size, w)

                cell = img_array[y1:y2, x1:x2]
                if cell.size == 0:
                    continue

                features = self.extract_features(cell)
                all_features.append(features)
                cell_positions.append((x1, y1, x2, y2, i, j))

        if not all_features:
            return {
                'disturbances': [],
                'overall_score': 0,
                'image_size': {'width': w, 'height': h},
                'ndvi_map': [],
                'features': {}
            }

        # Predict using model
        X = np.array(all_features)
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)[:, 1]

        # Generate simulated geographic coordinates
        # Default center: roughly central India
        base_lat = 20.5937 + random.uniform(-5, 5)
        base_lng = 78.9629 + random.uniform(-8, 8)

        # Scale: approximate 10m per pixel for Sentinel-2
        lat_scale = 10.0 / 111320  # degrees per pixel
        lng_scale = 10.0 / (111320 * math.cos(math.radians(base_lat)))

        for idx, (x1, y1, x2, y2, ri, ci) in enumerate(cell_positions):
            prob = float(probabilities[idx])
            pred = int(predictions[idx])

            # Adaptive threshold based on cell NDVI
            cell_ndvi = all_features[idx][0]
            cell_bsi = all_features[idx][1]
            cell_veg = all_features[idx][11]

            # High vegetation areas need much higher probability to flag
            if cell_ndvi > 0.3 and cell_veg > 0.45:
                threshold = 0.55
            elif cell_ndvi > 0.15 and cell_veg > 0.40:
                threshold = 0.35
            elif cell_bsi > 0.25 or cell_ndvi < -0.05:
                threshold = 0.10  # Bare soil / mining markers: very sensitive
            else:
                threshold = 0.20

            if prob > threshold:  # Adaptive threshold for flagging
                # Calculate center coordinates
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                det_lat = base_lat - cy * lat_scale
                det_lng = base_lng + cx * lng_scale

                # Estimate area in sq km
                pixel_area = (x2 - x1) * (y2 - y1) * 100  # 10m * 10m = 100 sq m per pixel
                area_sqkm = pixel_area / 1e6

                # Determine mineral type based on color analysis
                cell = img_array[y1:y2, x1:x2]
                mineral = self._estimate_mineral(cell)

                # Determine severity
                if prob > 0.85:
                    severity = "Critical"
                elif prob > 0.7:
                    severity = "High"
                elif prob > 0.55:
                    severity = "Medium"
                else:
                    severity = "Low"

                disturbances.append({
                    'id': f'DET-{idx+1:03d}',
                    'latitude': round(det_lat, 6),
                    'longitude': round(det_lng, 6),
                    'probability': round(prob, 4),
                    'prediction': pred,
                    'area_sqkm': round(area_sqkm, 4),
                    'pixel_bounds': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2},
                    'mineral_type': mineral,
                    'severity': severity,
                    'features': {
                        'ndvi': round(all_features[idx][0], 4),
                        'bsi': round(all_features[idx][1], 4),
                        'ndwi': round(all_features[idx][2], 4),
                        'texture_entropy': round(all_features[idx][3], 4),
                        'edge_density': round(all_features[idx][4], 4),
                        'soil_index': round(all_features[idx][10], 4),
                        'vegetation_ratio': round(all_features[idx][11], 4)
                    }
                })

        # Sort by probability (highest first)
        disturbances.sort(key=lambda x: x['probability'], reverse=True)

        # Calculate overall NDVI map
        ndvi_map = self._compute_ndvi_map(img_array)

        # Overall analysis features
        overall_features = self.extract_features(img_array)

        return {
            'disturbances': disturbances,
            'overall_score': round(float(np.mean(probabilities)), 4),
            'max_score': round(float(np.max(probabilities)), 4),
            'image_size': {'width': int(w), 'height': int(h)},
            'grid_size': {'rows': int(rows), 'cols': int(cols)},
            'center_coordinates': {'lat': round(float(base_lat), 4), 'lng': round(float(base_lng), 4)},
            'overall_features': {
                'ndvi': round(float(overall_features[0]), 4),
                'bsi': round(float(overall_features[1]), 4),
                'ndwi': round(float(overall_features[2]), 4),
                'texture_entropy': round(float(overall_features[3]), 4),
                'edge_density': round(float(overall_features[4]), 4),
                'brightness': round(float(overall_features[8]), 4),
                'soil_index': round(float(overall_features[10]), 4),
                'vegetation_ratio': round(float(overall_features[11]), 4)
            },
            'ndvi_summary': {
                'mean': round(float(np.mean(ndvi_map)), 4),
                'min': round(float(np.min(ndvi_map)), 4),
                'max': round(float(np.max(ndvi_map)), 4),
                'std': round(float(np.std(ndvi_map)), 4)
            }
        }

    def _estimate_mineral(self, cell):
        """Estimate mineral type from color characteristics."""
        r_mean = np.mean(cell[:,:,0])
        g_mean = np.mean(cell[:,:,1])
        b_mean = np.mean(cell[:,:,2])

        # Reddish = iron ore
        if r_mean > g_mean * 1.3 and r_mean > b_mean * 1.3:
            return "Iron Ore"
        # Yellowish-brown = sand
        elif r_mean > 150 and g_mean > 120 and b_mean < 100:
            return "Sand"
        # Dark = coal
        elif r_mean < 80 and g_mean < 80 and b_mean < 80:
            return "Coal"
        # Grayish = granite/limestone
        elif abs(r_mean - g_mean) < 20 and abs(g_mean - b_mean) < 20:
            if r_mean > 150:
                return "Limestone"
            else:
                return "Granite"
        # Brownish = bauxite
        elif r_mean > 120 and g_mean < 100 and b_mean < 80:
            return "Bauxite"
        else:
            return "Unknown Mineral"

    def _compute_ndvi_map(self, img_array):
        """Compute NDVI-like map from RGB image."""
        img_float = img_array.astype(np.float64)
        r = img_float[:,:,0]
        g = img_float[:,:,1]
        ndvi = np.where(
            (g + r) > 0,
            (g - r) / (g + r + 1e-10),
            0
        )
        return ndvi

    def generate_change_map(self, image_bytes):
        """Generate a visual change detection map from the image."""
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_array = np.array(img)

        # Compute NDVI
        ndvi = self._compute_ndvi_map(img_array)

        # Compute BSI
        img_float = img_array.astype(np.float64)
        r, g, b = img_float[:,:,0], img_float[:,:,1], img_float[:,:,2]
        bsi = np.where(
            (r + g + b) > 0,
            ((r + b) - g) / (r + g + b + 1e-10),
            0
        )

        # Create change detection overlay
        h, w = img_array.shape[:2]
        overlay = np.zeros((h, w, 4), dtype=np.uint8)

        # Red zones: high BSI (bare soil / excavation)
        high_bsi = bsi > 0.3
        overlay[high_bsi] = [255, 50, 50, 150]

        # Orange zones: moderate disturbance
        mod_dist = (bsi > 0.15) & (bsi <= 0.3) & (ndvi < 0.2)
        overlay[mod_dist] = [255, 150, 0, 120]

        # Yellow zones: potential disturbance
        pot_dist = (bsi > 0.05) & (ndvi < 0.15)
        overlay[pot_dist & ~high_bsi & ~mod_dist] = [255, 255, 0, 80]

        # Green zones: healthy vegetation
        healthy = ndvi > 0.4
        overlay[healthy] = [0, 200, 50, 60]

        # Blend with original
        result = img_array.copy()
        alpha = overlay[:,:,3:4] / 255.0
        rgb_overlay = overlay[:,:,:3]
        result = (result * (1 - alpha) + rgb_overlay * alpha).astype(np.uint8)

        # Encode to PNG bytes
        result_img = Image.fromarray(result)
        buf = io.BytesIO()
        result_img.save(buf, format='PNG')
        return buf.getvalue()


# Global model instance
detection_model = MiningDetectionModel()
