// ============================================================
// predict.js — 2027 Urban Expansion Forecast
// Applies trained RF model to current data, enforces landscape constraints
// ============================================================
// Dependencies: config.js, classification.js, model.js

// ---- 1. Assemble future predictor variables ----
// Uses 2024 as the baseline to predict 2027 built-up extent

var variablesFuture = ee.Image([
  built2024.rename('start_lulc'),
  changeMap,
  srtm.rename('elevation'),
  collection2024.select('NDBI').rename('start_ndbi'),
  collection2024.select('NDVI').rename('start_ndvi'),
  collection2024.select('MNDWI').rename('start_mndwi'),
  ee.Image(FUTURE_YEAR).multiply(built2018.neq(built2024)).rename('year')
]);

// ---- 2. Generate raw prediction ----

var rawPrediction = variablesFuture.classify(model, 'LULC_Prediction');

// ---- 3. Post-processing: enforce landscape constraints ----
// Prevents the model from predicting urban growth in:
//   - Water bodies (MNDWI >= 0)
//   - Desert sand (B12 >= 0.35)
//   - Steep terrain (slope >= 5°)

var b12_2024   = collection2024.select('B12');
var mndwi_2024 = collection2024.select('MNDWI');

var landscapeConstraints = b12_2024.lt(SAND_THRESHOLD)
    .and(mndwi_2024.lt(WATER_THRESHOLD))
    .and(slope.lt(SLOPE_THRESHOLD));

var constrainedPredictions = rawPrediction.and(landscapeConstraints);

// Union with existing 2024 built-up (urban areas don't disappear)
var lulcFuture = constrainedPredictions.or(built2024)
    .toByte()
    .rename('LULC_Prediction');

// ---- 4. Isolate new growth areas ----

var newGrowth = lulcFuture.subtract(built2024).selfMask();
