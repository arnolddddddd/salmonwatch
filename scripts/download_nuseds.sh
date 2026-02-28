#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="$(dirname "$0")/../data/nuseds"
mkdir -p "$DATA_DIR"

echo "Downloading NuSEDS All Areas dataset..."
curl -L -o "$DATA_DIR/nuseds_all_areas.zip" \
  "https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/c48669a3-045b-400d-b730-48aafe8c5ee6/attachments/All%20Areas%20NuSEDS_20251103.zip"

echo "Downloading NuSEDS Data Dictionary..."
curl -L -o "$DATA_DIR/data_dictionary.csv" \
  "https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/c48669a3-045b-400d-b730-48aafe8c5ee6/attachments/Data%20Dictionary%20NuSEDS_EN.csv"

echo "Downloading Conservation Unit Census Sites..."
curl -L -o "$DATA_DIR/cu_census_sites.csv" \
  "https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/c48669a3-045b-400d-b730-48aafe8c5ee6/attachments/Conservation%20Unit%20Census%20Sites_20250528.csv"

echo "Extracting..."
cd "$DATA_DIR"
unzip -o nuseds_all_areas.zip

echo "Done. Files in $DATA_DIR:"
ls -lh "$DATA_DIR"
