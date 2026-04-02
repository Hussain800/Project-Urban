// ============================================================
// model.js — Random Forest Training & Validation
// Feature engineering, model training, accuracy assessment
// ============================================================
// Dependencies: config.js, classification.js

// ---- 1. Assemble predictor variables ----

print('Training Random Forest model...');

var variables = ee.Image([
  built2018.rename('start_lulc'),
  built2024.rename('end_lulc'),
  changeMap,
  srtm.clip(roi).rename('elevation'),
  collection2018.select('NDBI').rename('start_ndbi'),
  collection2018.select('NDVI').rename('start_ndvi'),
  collection2018.select('MNDWI').rename('start_mndwi'),
  ee.Image(YEAR_2024).multiply(built2018.neq(built2024)).rename('year')
]);

// Predictor bands (excluding start_lulc to prevent data leakage)
var propNames = ['elevation', 'year', 'start_ndbi', 'start_ndvi', 'start_mndwi'];
var predictName = 'end_lulc';

// ---- 2. Sample training data ----
// Stratified sampling ensures balanced representation across transition classes

var sample = variables.stratifiedSample({
  numPoints: 5000,
  classBand: 'transition',
  scale: 150,
  region: training_roi,
  tileScale: 16    // Handle memory limits for large regions
}).randomColumn();

// 80/20 train-test split
var train = sample.filter(ee.Filter.lte('random', 0.8));
var test  = sample.filter(ee.Filter.gt('random', 0.8));

print(ee.String('Training samples: ').cat(train.size().format()));
print(ee.String('Testing samples: ').cat(test.size().format()));

// ---- 3. Train Random Forest (50 trees) ----

var model = ee.Classifier.smileRandomForest(50)
    .train(train, predictName, propNames);

// ---- 4. Evaluate on held-out test set ----

var cm = test.classify(model, 'prediction')
    .errorMatrix('end_lulc', 'prediction');

print('Model Performance Summary:');
print(cm);
print(ee.String('Accuracy: ').cat(cm.accuracy().format('%.2f')));
print(ee.String('Kappa Coefficient: ').cat(cm.kappa().format('%.3f')));

// ---- 5. Spatial validation against 2024 ground truth ----

print('------------------------------------------------');
print('Validating model on 2024 data...');

var predicted2024 = variables.classify(model);
var b12_val   = collection2024.select('B12');
var mndwi_val = collection2024.select('MNDWI');

// Apply physical constraints to remove impossible predictions
var predicted2024Clean = predicted2024
    .and(b12_val.lt(SAND_THRESHOLD))
    .and(mndwi_val.lt(WATER_THRESHOLD))
    .toByte();

// Pixel-level agreement between prediction and actual 2024 classification
var match = predicted2024Clean.eq(built2024).rename('match');

var spatialAccuracy = match.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: training_roi,
  scale: 150,
  maxPixels: 1e13,
  tileScale: 16,
  bestEffort: true
}).get('match');

print(ee.String('Correctly Predicted Pixels: ')
    .cat(ee.Number(spatialAccuracy).multiply(100).format('%.2f'))
    .cat(' %'));
print('------------------------------------------------');
