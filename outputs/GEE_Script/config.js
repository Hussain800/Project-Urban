// ============================================================
// config.js — Project Configuration & Constants
// Dubai Urban Expansion Prediction (2027 Scenario)
// ============================================================

// Time periods for analysis
var YEAR_2018 = 2018;
var YEAR_2024 = 2024;
var FUTURE_YEAR = 2027;

// Sentinel-2 bands to select (including Scene Classification Layer for cloud masking)
var bandsToSelect = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'SCL'];

// Cloud cover tolerance (%) — higher tolerance ensures coverage over desert/coastal areas
var CLOUD_TOLERANCE = 20;

// Region of Interest: Dubai to Fujairah/East Coast
var roi = ee.Geometry.Rectangle([54.5, 24.6, 55.9, 25.6]);

// Smaller sampling ROI for training data extraction
var training_roi = ee.Geometry.Rectangle([55.1, 25.0, 55.4, 25.2]);

// SRTM Digital Elevation Model (for slope/elevation constraints)
var srtm = ee.Image("USGS/SRTMGL1_003");

// Classification thresholds
var NDBI_THRESHOLD = -0.05;   // Normalized Difference Built-up Index cutoff
var SAND_THRESHOLD = 0.35;    // SWIR band threshold to exclude desert sand
var WATER_THRESHOLD = 0;      // MNDWI threshold to exclude water bodies
var SLOPE_THRESHOLD = 5;      // Degrees — exclude steep terrain from built-up class
