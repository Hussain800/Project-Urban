# Project Urban

Urban expansion prediction model for the UAE using satellite imagery and machine learning.

## Overview

Project Urban is a geospatial machine learning project that analyzes historical satellite imagery to predict patterns of urban expansion in the United Arab Emirates. The model combines remote sensing indices with machine learning techniques to identify areas likely to experience future development.

The project focuses on understanding how cities expand over time and how data-driven methods can assist planners, researchers, and policymakers in monitoring urban growth.

## Motivation

Rapid urbanization in the UAE presents challenges for infrastructure planning, sustainability, and environmental management. By leveraging satellite imagery and machine learning, this project explores how urban growth can be detected and predicted using publicly available Earth observation data.

## Methodology

The model was developed using Google Earth Engine and combines remote sensing features with machine learning classification.

Key steps include:

1. Satellite imagery preprocessing using Sentinel-2 datasets  
2. Feature extraction using spectral indices:
   - NDBI (Normalized Difference Built-up Index)
   - NDVI (Normalized Difference Vegetation Index)
   - MNDWI (Modified Normalized Difference Water Index)
3. Terrain filtering using SRTM slope data to remove mountainous regions
4. Training a Random Forest model to classify built vs non-built areas
5. Temporal analysis using historical imagery to predict future urban expansion

The model was trained on historical land-use patterns between 2018 and 2024 and used to estimate potential built-up expansion by 2027.

## Results

The system generates spatial predictions highlighting areas with a high probability of future urban growth. A dual-map visualization allows comparison between current built-up areas and predicted expansion zones.

## Tech Stack

- Google Earth Engine
- Python
- Random Forest (Machine Learning)
- Sentinel-2 Satellite Imagery
- SRTM Elevation Data
- Geospatial Analysis

## Applications

Potential applications include:

- Urban planning and infrastructure forecasting
- Environmental monitoring
- Smart city development
- Land use analysis
