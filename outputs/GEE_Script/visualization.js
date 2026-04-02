// ============================================================
// visualization.js — Results Display, Charts & Export
// Area statistics, bar charts, split-panel map, GeoTIFF export
// ============================================================
// Dependencies: config.js, utils.js, classification.js, model.js, predict.js

// ---- 1. Area calculations ----

/**
 * Calculates the total area (in hectares) of built-up pixels in a binary image.
 * @param {ee.Image} image - Binary classification (1 = built)
 * @param {string} className - Label for logging
 * @returns {ee.Number} Total built-up area in hectares
 */
function calculateArea(image, className) {
  var areaImage = ee.Image.pixelArea().divide(10000); // Convert m² to hectares
  var area = areaImage.updateMask(image.eq(1))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 150,
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

// New growth statistics
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
print(ee.String('New Development (2024->2027): ')
    .cat(ee.Number(newGrowthAreaVal).format('%.2f')).cat(' hectares'));

// ---- 2. Area expansion bar chart ----

var lulcListArea = [
  { year: YEAR_2018, image: built2018 },
  { year: YEAR_2024, image: built2024 },
  { year: FUTURE_YEAR, image: lulcFuture }
];

var lulcAreafeatures = ee.FeatureCollection(lulcListArea.map(function(dict) {
  var imageArea = ee.Image.pixelArea().divide(10000);
  var reduceArea = imageArea.addBands(dict.image).reduceRegion({
    reducer: ee.Reducer.sum().setOutputs(['area']).group(1, 'class'),
    scale: 150,
    geometry: roi,
    bestEffort: true,
    tileScale: 16
  }).get('groups');

  var features = ee.FeatureCollection(ee.List(reduceArea).map(function(dictionary) {
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
    hAxis: { title: 'Year', format: '####' },
    vAxis: { title: 'Built Area (Hectares)' },
    colors: ['#808080', '#FFA500', '#FF0000'],
    series: { 0: { color: '#A0A0A0' }, 1: { color: '#FF0000' } }
  });
print(chartArea);

// ---- 3. GeoTIFF export for CNN validation pipeline ----

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

// ---- 4. Split-panel map visualization ----

var builtPalette = ['000000', 'FF0000'];
var visParams = { min: 0, max: 1, palette: builtPalette };
var ndbiVis   = { min: -0.2, max: 0.5, palette: ['008000', 'FFFFFF', 'FF0000'] };
var ndviVis   = { min: -0.2, max: 0.8, palette: ['8B4513', 'FFFF00', '00FF00'] };
var mndwiVis  = { min: -0.5, max: 0.5, palette: ['4B0082', '8A2BE2', '0000FF'] };
var transitionVis = { min: 1, max: 111, palette: ['00FF00', 'FFFF00', 'FF0000'] };

// Left panel: 2024 current state
var leftMap = ui.Map();
leftMap.setOptions('HYBRID');
leftMap.addLayer(predicted2024Clean, { min: 0, max: 1, palette: ['black', 'orange'] },
    'Validation: Predicted 2024 (Orange)', false);
leftMap.addLayer(changeMap, transitionVis, 'Built Area Transition (2018-2024)', false);
leftMap.addLayer(collection2024.select('NDBI'), ndbiVis, 'NDBI 2024', false);
leftMap.addLayer(collection2024.select('NDVI'), ndviVis, 'NDVI 2024', false);
leftMap.addLayer(collection2024.select('MNDWI'), mndwiVis, 'MNDWI 2024', false);
leftMap.addLayer(built2024, visParams, 'Built Area 2024', true);
leftMap.add(ui.Label('2024 (Current)', {
  position: 'top-center', fontSize: '16px', fontWeight: 'bold',
  backgroundColor: 'rgba(255, 255, 255, 0.8)'
}));

// Right panel: 2027 prediction
var rightMap = ui.Map();
rightMap.setOptions('HYBRID');
rightMap.addLayer(collection2024.select('NDBI'), ndbiVis, 'NDBI 2024', false);
rightMap.addLayer(collection2024.select('NDVI'), ndviVis, 'NDVI 2024', false);
rightMap.addLayer(collection2024.select('MNDWI'), mndwiVis, 'MNDWI 2024', false);
rightMap.addLayer(lulcFuture, visParams, 'Predicted Built 2027', true);
rightMap.addLayer(newGrowth, { min: 0, max: 1, palette: ['FFFF00'] },
    'New Growth Only (2024->2027)', false);
rightMap.add(ui.Label('2027 (Prediction)', {
  position: 'top-center', fontSize: '16px', fontWeight: 'bold',
  backgroundColor: 'rgba(255, 255, 255, 0.8)'
}));

// Legends
var legendLeft  = legend(builtPalette, [0, 1], ['Not Built', 'Built']);
var legendRight = legend(
    ['000000', 'FF0000', 'FFFF00'], [0, 1, 2],
    ['Not Built', 'Built (2024)', 'New Growth (Predicted)']
);
leftMap.add(legendLeft);
rightMap.add(legendRight);

// Linked split panel
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true,
  style: { stretch: 'both' }
});

var linker = ui.Map.Linker([leftMap, rightMap]);
leftMap.centerObject(roi, 10);

ui.root.clear();
ui.root.add(splitPanel);
