// ============================================================
// utils.js — Helper Functions
// Legend rendering, spectral index computation, cloud masking
// ============================================================

/**
 * Creates a map legend panel for the GEE UI.
 * @param {Array<string>} palette - Hex color codes
 * @param {Array<number>} values - Class values
 * @param {Array<string>} names  - Human-readable class names
 * @returns {ui.Panel} Legend panel widget
 */
function legend(palette, values, names) {
  var legendPanel = ui.Panel({
    style: { position: 'bottom-left', padding: '8px 15px' }
  });
  var legendTitle = ui.Label({
    value: 'Legend',
    style: { fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0', padding: '0' }
  });
  legendPanel.add(legendTitle);

  palette.map(function(color, index) {
    var colorBox = ui.Panel({
      widgets: [
        ui.Label('', {
          backgroundColor: color, width: '30px', height: '20px',
          padding: '0', margin: '0'
        }),
        ui.Label(names[index], { margin: '0 0 0 8px', fontSize: '14px' })
      ],
      layout: ui.Panel.Layout.flow('horizontal'),
      style: { margin: '4px 0' }
    });
    legendPanel.add(colorBox);
  });

  return legendPanel;
}

/**
 * Computes spectral indices and appends them as new bands.
 *   NDBI — Normalized Difference Built-up Index (highlights urban surfaces)
 *   NDVI — Normalized Difference Vegetation Index (highlights vegetation)
 *   MNDWI — Modified Normalized Difference Water Index (highlights water)
 * @param {ee.Image} image - Sentinel-2 surface reflectance image
 * @returns {ee.Image} Image with NDBI, NDVI, MNDWI bands added
 */
var addIndices = function(image) {
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var mndwi = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');
  return image.addBands(ndbi).addBands(ndvi).addBands(mndwi);
};

/**
 * Masks clouds and cloud shadows using Sentinel-2 Scene Classification Layer.
 * Removes classes: 3 (cloud shadows), 8-10 (clouds), 11 (snow/ice).
 * Also scales reflectance values from raw DN to 0-1 range.
 * @param {ee.Image} image - Raw Sentinel-2 SR image
 * @returns {ee.Image} Cloud-free, scaled image
 */
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var cloudMask = scl.eq(3).or(scl.eq(8)).or(scl.eq(9))
                     .or(scl.eq(10)).or(scl.eq(11)).not();
  return image.updateMask(cloudMask).divide(10000);
}
