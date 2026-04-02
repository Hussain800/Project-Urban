// ============================================================
// main.js — Entry Point
// Dubai Urban Expansion Prediction (2027 Scenario)
// ============================================================
//
// ABOUT:
//   This project uses Google Earth Engine to analyze 7 years of
//   Sentinel-2 satellite imagery and predict urban expansion in
//   Dubai by 2027. It trains a 50-tree Random Forest classifier
//   on spectral indices and terrain features, then forecasts
//   ~2,936 hectares of new development.
//
// HOW TO RUN:
//   This project is designed for the Google Earth Engine Code Editor.
//   To run as a single script, paste the contents of each file
//   into the GEE Code Editor in this order:
//
//   1. config.js          — Constants, thresholds, ROI definitions
//   2. utils.js           — Helper functions (legend, indices, cloud mask)
//   3. classification.js  — Image compositing & built-up classification
//   4. model.js           — Random Forest training & validation
//   5. predict.js         — 2027 prediction with landscape constraints
//   6. visualization.js   — Area stats, charts, map display & export
//
//   Alternatively, use GEE's repository system to import modules:
//     var config = require('users/YOUR_USERNAME/project-urban:config');
//
// REQUIREMENTS:
//   - Google Earth Engine account (https://earthengine.google.com/)
//   - Access to Sentinel-2 SR Harmonized collection
//   - Access to USGS SRTM elevation data
//
// AUTHOR: Hussain Sabuwala
// DATE:   December 2025
// ============================================================

// To run the full pipeline, load files in order:
// config.js → utils.js → classification.js → model.js → predict.js → visualization.js
