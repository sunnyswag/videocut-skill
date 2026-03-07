#!/bin/bash
#
# Create clipping output directory structure
#
# Usage: ./0_setup_output.sh <VIDEO_PATH> [WORKSPACE_ROOT]
# Output: BASE_DIR absolute path
#
# Structure: output/YYYY-MM-DD_video/clipping/{1_transcribe,2_analysis,3_review,common}
#

VIDEO_PATH="$1"
WORKSPACE_ROOT="${2:-$(pwd)}"

if [ -z "$VIDEO_PATH" ]; then
  echo "❌ 用法: ./setup_output.sh <VIDEO_PATH> [WORKSPACE_ROOT]" >&2
  exit 1
fi

VIDEO_NAME=$(basename "$VIDEO_PATH" .mp4)
DATE=$(date +%Y-%m-%d)
BASE_DIR="$WORKSPACE_ROOT/output/${DATE}_${VIDEO_NAME}/clipping"

mkdir -p "$BASE_DIR/1_transcribe" "$BASE_DIR/2_analysis" "$BASE_DIR/3_review" "$BASE_DIR/common"

echo "$BASE_DIR"
