// DUBAI URBAN EXPANSION PREDICTION - 2027 SCENARIO

// 1. UI & HELPER FUNCTIONS

function legend(palette, values, names){
  var legendPanel = ui.Panel({
    style: { position: 'bottom-left', padding: '8px 15px' }
  });
  var legendTitle = ui.Label({
    value: 'Legend',
    style: { fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0', padding: '0' }
  });
  legendPanel.add(legendTitle);
  palette.map(function(color, index){
    var colorBox = ui.Panel({
      widgets: [
        ui.Label('', { backgroundColor: color, width: '30px', height: '20px', padding: '0', margin: '0' }),
        ui.Label(names[index], { margin: '0 0 0 8px', fontSize: '14px' })
      ],
      layout: ui.Panel.Layout.flow('horizontal'),
      style: {margin: '4px 0'}
    });
    legendPanel.add(colorBox);
  });
  return legendPanel;
}

// Compute spectral indices (NDBI, NDVI, MNDWI)
var addIndices = function(image) {
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var mndwi = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');
  return image.addBands(ndbi).addBands(ndvi).addBands(mndwi);
};

// Mask Sentinel-2 clouds using SCL band
function maskS2clouds(image) {
  var scl = image.select('SCL');
  // Mask out classes 3 (cloud shadows), 8-10 (clouds), 11 (snow/ice)
  var cloudMask = scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10)).or(scl.eq(11)).not();
  return image.updateMask(cloudMask).divide(10000);
}


// 2. CONFIGURATION


var YEAR_2018 = 2018;
var YEAR_2024 = 2024;
var FUTURE_YEAR = 2027;
var bandsToSelect = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'SCL'];

// Main ROI (Dubai to Fujairah/East Coast)
var roi = ee.Geometry.Rectangle([54.5, 24.6, 55.9, 25.6]);

// Sampling ROI for training
var training_roi = ee.Geometry.Rectangle([55.1, 25.0, 55.4, 25.2]);

var srtm = ee.Image("USGS/SRTMGL1_003");

// 3. IMAGE COLLECTION PROCESSING

print('Processing satellite imagery...');

// Higher tolerance to ensure coverage over Jebel Ali/Desert areas
var CLOUD_TOLERANCE = 20; 

var collection2018 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(YEAR_2018 + '-01-01', YEAR_2018 + '-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_TOLERANCE))
    .select(bandsToSelect)
    .map(maskS2clouds)
    .median(); 
collection2018 = addIndices(collection2018);

var collection2024 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(YEAR_2024 + '-01-01', YEAR_2024 + '-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_TOLERANCE))
    .select(bandsToSelect)
    .map(maskS2clouds)
    .median(); 
collection2024 = addIndices(collection2024);

print('Data acquisition complete.');


// 4. LULC CLASSIFICATION & CHANGE DETECTION


// Thresholds for classification logic
var NDBI_THRESHOLD = -0.05; 
var SAND_THRESHOLD = 0.35;
var WATER_THRESHOLD = 0; 
var SLOPE_THRESHOLD = 5; // Exclude steep terrain

var slope = ee.Terrain.slope(srtm);

function classifyBuilt(image) {
  var ndbi = image.select('NDBI');
  var b12 = image.select('B12');
  var mndwi = image.select('MNDWI'); 
  
  // Logic: High NDBI, not sand, not water, and flat terrain
  return ndbi.gt(NDBI_THRESHOLD)
    .and(b12.lt(SAND_THRESHOLD))
    .and(mndwi.lt(WATER_THRESHOLD)) 
    .and(slope.lt(SLOPE_THRESHOLD))
    .multiply(1)
    .toByte()
    .rename('LULC');
}

var built2018 = classifyBuilt(collection2018);
var built2024 = classifyBuilt(collection2024);

// Generate transition map (Change Detection)
var changeMap = ee.Image(0).toByte();
var classes = [0, 1];
classes.map(function(value1, index1){
  classes.map(function(value2, index2){
    var changeValue = value1 * 1e2 + value2;
    changeMap = changeMap.where(
      built2018.eq(value1).and(built2024.eq(value2)), 
      changeValue
    );
  });
});
changeMap = changeMap.rename('transition');


// 5. RANDOM FOREST TRAINING

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

// Define predictors (excluding start_lulc to avoid leakage)
var propNames = ['elevation', 'year', 'start_ndbi', 'start_ndvi', 'start_mndwi'];
var predictName = 'end_lulc';

var sample = variables.stratifiedSample({
  numPoints: 5000,
  classBand: 'transition',
  scale: 150,
  region: training_roi,
  tileScale: 16 // Handle memory limits
}).randomColumn();

// 80/20 Train/Test split
var train = sample.filter(ee.Filter.lte('random', 0.8));
var test = sample.filter(ee.Filter.gt('random', 0.8));

print(ee.String('Training samples: ').cat(train.size().format()));
print(ee.String('Testing samples: ').cat(test.size().format()));

var model = ee.Classifier.smileRandomForest(50).train(train, predictName, propNames);

var cm = test.classify(model, 'prediction').errorMatrix('end_lulc', 'prediction');
print('Model Performance Summary:');
print(cm);
print(ee.String('Accuracy: ').cat(cm.accuracy().format('%.2f')));
print(ee.String('Kappa Coefficient: ').cat(cm.kappa().format('%.3f')));


// 6. VALIDATION

print('------------------------------------------------');
print('Validating model on 2024 data...');

var predicted2024 = variables.classify(model);
var b12_val = collection2024.select('B12');
var mndwi_val = collection2024.select('MNDWI');

// Apply physical constraints to prediction
var predicted2024Clean = predicted2024
    .and(b12_val.lt(SAND_THRESHOLD))
    .and(mndwi_val.lt(WATER_THRESHOLD))
    .toByte();

// Calculate spatial accuracy
var match = predicted2024Clean.eq(built2024).rename('match');

var spatialAccuracy = match.reduceRegion({
  reducer: ee.Reducer.mean(), 
  geometry: training_roi, 
  scale: 150, 
  maxPixels: 1e13,
  tileScale: 16,   // Increased to prevent computation timeout
  bestEffort: true
}).get('match');

print(ee.String('Correctly Predicted Pixels: ').cat(ee.Number(spatialAccuracy).multiply(100).format('%.2f')).cat(' %'));
print('------------------------------------------------');


// 7. 2027 PREDICTION

var variablesFuture = ee.Image([
  built2024.rename('start_lulc'),
  changeMap,
  srtm.rename('elevation'),
  collection2024.select('NDBI').rename('start_ndbi'),
  collection2024.select('NDVI').rename('start_ndvi'),
  collection2024.select('MNDWI').rename('start_mndwi'),
  ee.Image(FUTURE_YEAR).multiply(built2018.neq(built2024)).rename('year')
]);

var rawPrediction = variablesFuture.classify(model, 'LULC_Prediction');

// Post-Processing: Enforce landscape constraints
var b12_2024 = collection2024.select('B12');
var mndwi_2024 = collection2024.select('MNDWI');

// Prevent growth in water bodies or on steep slopes
var landscapeConstraints = b12_2024.lt(SAND_THRESHOLD)
    .and(mndwi_2024.lt(WATER_THRESHOLD))
    .and(slope.lt(SLOPE_THRESHOLD));

var constrainedPredictions = rawPrediction.and(landscapeConstraints);
var lulcFuture = constrainedPredictions.or(built2024).toByte().rename('LULC_Prediction');


// 8. AREA CALCULATIONS & CHARTS


function calculateArea(image, className) {
  var areaImage = ee.Image.pixelArea().divide(10000); // Hectares
  var area = areaImage.updateMask(image.eq(1))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 150,      // Using 150m for faster calculation
      maxPixels: 1e13,
      tileScale: 16,   
      bestEffort: true
    });
  return ee.Number(area.get('area'));
}

var area2018 = calculateArea(built2018, 'Built 2018');
var area2024 = calculateArea(built2024, 'Built 2024');
var area2027 = calculateArea(lulcFuture, 'Built 2027');

print('Area Calculation (Hectares):');
print(ee.String('Built Area 2018: ').cat(area2018.format('%.2f')));
print(ee.String('Built Area 2024: ').cat(area2024.format('%.2f')));
print(ee.String('Predicted Area 2027: ').cat(area2027.format('%.2f')));

var lulcListArea = [
  { year: YEAR_2018, image: built2018 },
  { year: YEAR_2024, image: built2024 },
  { year: FUTURE_YEAR, image: lulcFuture }
];

var lulcAreafeatures = ee.FeatureCollection(lulcListArea.map(function(dict){
  var imageArea = ee.Image.pixelArea().divide(10000);
  var reduceArea = imageArea.addBands(dict.image).reduceRegion({
    reducer: ee.Reducer.sum().setOutputs(['area']).group(1, 'class'),
    scale: 150,
    geometry: roi,
    bestEffort: true,
    tileScale: 16
  }).get('groups');
  
  var features = ee.FeatureCollection(ee.List(reduceArea).map(function(dictionary){
    dictionary = ee.Dictionary(dictionary);
    var label = ee.Number(dictionary.get('class')).eq(1) ? 'Built' : 'Not Built';
    dictionary = dictionary.set('year', ee.Number(dict.year).toInt());
    dictionary = dictionary.set('LULC', label);
    return ee.Feature(null, dictionary);
  }));
  return features;
})).flatten();

var chartArea = ui.Chart.feature.groups(lulcAreafeatures, 'year', 'area', 'LULC')
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Dubai Built Area Expansion (2018-2027)',
    hAxis: {title: 'Year', format: '####'},
    vAxis: {title: 'Built Area (Hectares)'},
    colors: ['#808080', '#FFA500', '#FF0000'],
    series: { 0: {color: '#A0A0A0'}, 1: {color: '#FF0000'} }
  });
print(chartArea);


// 9. EXPORTS


var exportImage = ee.Image([
  collection2024.select(['B4', 'B3', 'B2']),
  built2024.rename('label')
]).toFloat(); 

Export.image.toDrive({
  image: exportImage,
  description: 'Dubai_Full_Map_2024',
  folder: 'NovaWorks_Project',
  region: roi,
  scale: 150,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13 
});


// 10. VISUALIZATION


var builtPalette = ['000000', 'FF0000'];
var visParams = {min: 0, max: 1, palette: builtPalette};
var ndbiVis = {min: -0.2, max: 0.5, palette: ['008000', 'FFFFFF', 'FF0000']};
var ndviVis = {min: -0.2, max: 0.8, palette: ['8B4513', 'FFFF00', '00FF00']};
var mndwiVis = {
  min: -0.5, 
  max: 0.5, 
  palette: ['4B0082', '8A2BE2', '0000FF'] 
};
var transitionVis = {min: 1, max: 111, palette: ['00FF00', 'FFFF00', 'FF0000']};

var leftMap = ui.Map();
leftMap.setOptions('HYBRID');
leftMap.addLayer(predicted2024Clean, {min: 0, max: 1, palette: ['black', 'orange']}, 'Validation: Predicted 2024 (Orange)', false);
leftMap.addLayer(changeMap, transitionVis, 'Built Area Transition (2018-2024)', false);
leftMap.addLayer(collection2024.select('NDBI'), ndbiVis, 'NDBI 2024', false);
leftMap.addLayer(collection2024.select('NDVI'), ndviVis, 'NDVI 2024', false);
leftMap.addLayer(collection2024.select('MNDWI'), mndwiVis, 'MNDWI 2024', false);
leftMap.addLayer(built2024, visParams, 'Built Area 2024', true);
leftMap.add(ui.Label('2024 (Current)', {position: 'top-center', fontSize: '16px', fontWeight: 'bold', backgroundColor: 'rgba(255, 255, 255, 0.8)'}));

var rightMap = ui.Map();
rightMap.setOptions('HYBRID');
rightMap.addLayer(collection2024.select('NDBI'), ndbiVis, 'NDBI 2024', false);
rightMap.addLayer(collection2024.select('NDVI'), ndviVis, 'NDVI 2024', false);
rightMap.addLayer(collection2024.select('MNDWI'), mndwiVis, 'MNDWI 2024', false);
rightMap.addLayer(lulcFuture, visParams, 'Predicted Built 2027', true);


// 11. GROWTH HIGHLIGHTS


// Isolate new growth areas (2027 vs 2024)
var newGrowth = lulcFuture.subtract(built2024).selfMask();

// Highlight new growth in yellow
rightMap.addLayer(newGrowth, {min: 0, max: 1, palette: ['FFFF00']}, 'New Growth Only (2024->2027)', false);

// Calculate total new growth area
// Using 150m scale and high tileScale for performance
var newGrowthStats = newGrowth.multiply(ee.Image.pixelArea().divide(10000))
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 150,     
    maxPixels: 1e13,
    tileScale: 16,   
    bestEffort: true 
  });

var newGrowthAreaVal = newGrowthStats.get('LULC_Prediction');

print(ee.String('New Development (2024->2027): ').cat(ee.Number(newGrowthAreaVal).format('%.2f')).cat(' hectares'));

rightMap.add(ui.Label('2027 (Prediction)', {position: 'top-center', fontSize: '16px', fontWeight: 'bold', backgroundColor: 'rgba(255, 255, 255, 0.8)'}));

var legendLeft = legend(builtPalette, [0, 1], ['Not Built', 'Built']);
var legendRight = legend(builtPalette, [0, 1], ['Not Built', 'Built']);
leftMap.add(legendLeft);
rightMap.add(legendRight);

var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true,
  style: {stretch: 'both'}
});

var linker = ui.Map.Linker([leftMap, rightMap]);
leftMap.centerObject(roi, 10);

ui.root.clear();
ui.root.add(splitPanel);
