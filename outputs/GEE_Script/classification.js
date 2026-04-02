// ============================================================
// classification.js — Image Processing & LULC Classification
// Sentinel-2 compositing, built-up area extraction, change detection
// ============================================================
// Dependencies: config.js, utils.js

// ---- 1. Build cloud-free annual composites ----

print('Processing satellite imagery...');

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

// ---- 2. Classify built-up areas ----

var slope = ee.Terrain.slope(srtm);

/**
 * Classifies pixels as built-up (1) or not built-up (0).
 * Logic: High NDBI AND not sand AND not water AND flat terrain.
 * Uses multiple spectral and topographic constraints to reduce
 * false positives from desert sand and water bodies.
 * @param {ee.Image} image - Sentinel-2 composite with spectral indices
 * @returns {ee.Image} Binary built-up classification (0/1)
 */
function classifyBuilt(image) {
  var ndbi = image.select('NDBI');
  var b12  = image.select('B12');
  var mndwi = image.select('MNDWI');

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

// ---- 3. Change detection (transition map) ----
// Encodes 2018→2024 transitions as two-digit codes:
//   0  = Not Built → Not Built
//   1  = Not Built → Built (new development)
//   100 = Built → Not Built (demolition/error)
//   101 = Built → Built (stable urban)

var changeMap = ee.Image(0).toByte();
var classes = [0, 1];
classes.map(function(value1, index1) {
  classes.map(function(value2, index2) {
    var changeValue = value1 * 1e2 + value2;
    changeMap = changeMap.where(
      built2018.eq(value1).and(built2024.eq(value2)),
      changeValue
    );
  });
});
changeMap = changeMap.rename('transition');
