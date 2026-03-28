# Project Urban

Urban expansion prediction in Dubai using satellite imagery, machine learning, and deep learning.

## Overview

Project Urban is a geospatial machine learning pipeline designed to analyze and predict urban expansion in Dubai using satellite data.

The project integrates:
- remote sensing (Sentinel-2)
- geospatial processing (Google Earth Engine)
- supervised machine learning (Random Forest)
- deep learning (CNN)
- interactive visualization

to model how built-up areas evolve over time and to forecast future urban growth.

## Objectives

- Classify built vs non-built land for 2018 and 2024  
- Learn historical transition patterns (2018 → 2024)  
- Predict urban expansion for 2027  
- Validate dataset consistency using deep learning  
- Build a visualization system for interpreting results  

## Data Pipeline (GEE)

### Data Sources

- Sentinel-2 Surface Reflectance (2018, 2024)  
- SRTM elevation data  

### Preprocessing

- Cloud masking using SCL band  
- CLOUDY_PIXEL_PERCENTAGE < 20%  
- Median compositing for stable yearly representation  

### Feature Engineering

The following indices were computed:

- **NDBI** → built-up detection  
- **NDVI** → vegetation  
- **MNDWI** → water bodies  

### Landscape Constraints

To ensure realistic predictions, non-buildable regions were removed:

- Slope mask (< 5°)  
- Sand filtering (SWIR threshold)  
- Water masking (MNDWI)  

Only physically buildable land is considered by the model.

## Urban Growth Model (Random Forest)

### Training Setup

- 50-tree Random Forest  
- Stratified sampling (~5000 points)  
- 80/20 train-test split  

### Input Features

- Spectral: NDBI, NDVI, MNDWI  
- Topographic: elevation  
- Temporal: year indicator  
- Contextual: transition behavior (2018 → 2024)  

### Output

- Built vs non-built classification  
- Learned transition patterns  

### Prediction

The model predicts:
- built-up areas in 2024  
- future expansion for 2027  

## Results

### Built Area Estimates

| Year | Built Area (ha) |
|------|----------------|
| 2018 | 137,653.99 |
| 2024 | 155,211.01 |
| 2027 (Predicted) | 157,765.33 |

**New Growth (2024 → 2027): ~2,936 ha**

### Interpretation

- Rapid expansion between 2018–2024  
- Slower projected growth due to physical constraints  
- Growth concentrated near existing urban regions  

## Urban Expansion Prediction

![Urban Expansion](outputs/maps/predicted_build_final.png)

The model highlights areas with high probability of future development while enforcing terrain and environmental constraints.

## Deep Learning Consistency Check (CNN)

### Purpose

The CNN does **not validate the Random Forest model directly**.

Instead, it checks:
> whether RGB satellite imagery aligns consistently with the generated built/not-built labels

### Dataset

- 2024 satellite image sliced into 64×64 tiles  
- Tiles labeled based on built mask (>10% threshold)  
- Resized to 224×224  

### Model

- ResNet-18 (ImageNet pretrained)  
- Fully fine-tuned  
- Data augmentation applied  

### Training

- 80/20 split  
- Batch size: 16  
- Epochs: 5  

### Results

- Validation Accuracy: **~95.5%**  
- Strong separation between built and non-built areas  

### Insight

- Satellite RGB data strongly encodes urban structure  
- GEE-generated labels are spatially consistent  

## Visualization & Dashboard

An interactive dashboard was developed to:

- compare 2018, 2024, and 2027 maps  
- visualize expansion hotspots  
- inspect transitions and masks  
- explore spatial patterns  

Dashboard link:  
https://hussainsabuwala04.users.earthengine.app/view/project-urban

## Tech Stack

- Google Earth Engine  
- Python (PyTorch, scikit-learn)  
- Random Forest  
- ResNet-18 (CNN)  
- Sentinel-2 imagery  
- SRTM elevation data  

## Key Insights

- Urban expansion follows existing infrastructure  
- Physical constraints significantly limit future growth  
- Machine learning effectively captures transition dynamics  
- Deep learning confirms dataset consistency  

## Limitations

- CNN uses GEE-derived labels (not independent ground truth)  
- No socio-economic or policy data included  
- Model does not account for zoning or infrastructure plans  

## Future Work

- Incorporate transportation and planning data  
- Use U-Net for pixel-level segmentation  
- Add multi-temporal modeling  
- Improve hotspot detection  

## Conclusion

This project demonstrates a full geospatial AI pipeline combining:

- remote sensing  
- machine learning  
- deep learning  
- interactive visualization  

to analyze and predict urban expansion in Dubai.

The framework is scalable and can be extended to other cities and planning applications.

```markdown
## Pipeline

The project follows a two-stage workflow:

### 1. Geospatial processing and urban growth prediction
- Load Sentinel-2 imagery for 2018 and 2024 in Google Earth Engine  
- Apply cloud masking and generate yearly median composites  
- Compute NDBI, NDVI, and MNDWI  
- Apply terrain and landscape constraints using slope, sand, and water masks  
- Classify built vs non-built land  
- Generate a transition map from 2018 to 2024  
- Train a Random Forest model on historical change patterns  
- Predict built-up expansion for 2027  
- Compute area statistics and visualize predicted growth  

### 2. Deep learning consistency check
- Export the 2024 RGB image together with the built mask  
- Slice the exported GeoTIFF into 64×64 RGB tiles in Colab  
- Label each tile as built or not built based on the mask  
- Train a ResNet-18 classifier on the generated tiles  
- Evaluate visual consistency using validation accuracy and confusion matrix  

##Visualization

```text
Sentinel-2 imagery (2018, 2024) + SRTM elevation
                  │
                  ▼
        Preprocessing in Google Earth Engine
   - cloud masking
   - yearly median composites
   - spectral index generation
                  │
                  ▼
          Feature extraction and masking
   - NDBI
   - NDVI
   - MNDWI
   - slope filtering
   - sand filtering
   - water masking
                  │
                  ▼
      Built vs non-built classification (2018, 2024)
                  │
                  ▼
        Transition map generation (2018 → 2024)
                  │
                  ▼
      Random Forest training on historical transitions
                  │
                  ▼
            Urban growth prediction for 2027
                  │
                  ├──────────────► Area statistics and growth estimates
                  │
                  ├──────────────► Dual-map visualization / dashboard
                  │
                  ▼
        Export 2024 RGB + built mask as GeoTIFF
                  │
                  ▼
      Tile generation in Colab (64×64 RGB image chips)
                  │
                  ▼
      CNN consistency check using ResNet-18
   - tile labeling from built mask
   - train/validation split
   - augmentation + fine-tuning
   - confusion matrix + validation accuracy
