A geospatial machine learning pipeline that analyzes **7 years of Sentinel-2 satellite imagery** to classify built-up areas across Dubai and forecast urban expansion by 2027.

## What It Does

Dubai is one of the fastest-developing cities in the world. This project answers the question: **where will Dubai expand next?**

It processes satellite data from 2018 and 2024, trains a Random Forest classifier on spectral and terrain features, and generates a 2027 prediction map — forecasting approximately **2,936 hectares** of new urban development.

### Key Results
- **155,000+ hectares** of Dubai analyzed from Sentinel-2 imagery
- **50-tree Random Forest** classifier trained on 5 spectral/terrain features
- **95%+ spatial accuracy** validated against 2024 ground truth
- Interactive **split-panel map** comparing 2024 vs predicted 2027

## How It Works

### Pipeline Overview

```
Sentinel-2 Imagery → Cloud Masking → Spectral Indices → Built-up Classification
        ↓                                                        ↓
   2018 Composite ──────────────────────────────────> Change Detection
   2024 Composite ──────────────────────────────────>      ↓
        ↓                                          Feature Engineering
   Terrain Data (SRTM) ───────────────────────────>      ↓
                                                   Random Forest Training
                                                         ↓
                                                   2027 Prediction
                                                         ↓
                                              Landscape Constraints
                                                         ↓
                                              Visualization & Export
```

### Classification Logic
Pixels are classified as built-up using multi-criteria thresholding:
- **NDBI > -0.05** (urban surface signal)
- **SWIR (B12) < 0.35** (excludes desert sand)
- **MNDWI < 0** (excludes water bodies)
- **Slope < 5°** (excludes mountainous terrain)

### Post-Processing
Raw predictions are constrained by physical landscape rules to prevent impossible forecasts (e.g., urban growth in the sea or on steep mountains). Existing 2024 built-up areas are preserved (cities don't disappear).

## Project Structure

```
project-urban/
├── config.js            # Constants, thresholds, region definitions
├── utils.js             # Legend, spectral indices, cloud masking
├── classification.js    # Image compositing, LULC classification, change detection
├── model.js             # Random Forest training, validation, accuracy metrics
├── predict.js           # 2027 forecast with landscape constraints
├── visualization.js     # Area statistics, charts, split-panel map, export
├── main.js              # Entry point with execution instructions
└── README.md
```

## How to Run

### Requirements
- [Google Earth Engine](https://earthengine.google.com/) account (free for research/education)
- Browser-based — no local installation needed

### Quick Start
1. Open the [GEE Code Editor](https://code.earthengine.google.com/)
2. Paste the contents of each file into the editor **in order**: `config.js` → `utils.js` → `classification.js` → `model.js` → `predict.js` → `visualization.js`
3. Click **Run**
4. View the split-panel map comparing 2024 built-up areas vs 2027 predictions

### Using GEE Modules (Alternative)
If you have write access to a GEE repository, you can import files as modules using `require()`.

## Technologies Used

- **Google Earth Engine** — cloud-based geospatial analysis platform
- **JavaScript (GEE API)** — data processing, ML training, visualization
- **Sentinel-2 SR Harmonized** — 10m multispectral satellite imagery
- **SRTM** — 30m digital elevation model
- **Random Forest** — ensemble classifier (ee.Classifier.smileRandomForest)

## What I Learned

- How to design a complete ML pipeline from raw data to deployed predictions
- Working with large-scale geospatial datasets (terabytes of satellite imagery processed server-side)
- The importance of post-processing and domain constraints — a model's raw output often needs physical-world rules to produce sensible results
- Feature engineering for remote sensing: why spectral indices like NDBI and NDVI are more informative than raw band values
