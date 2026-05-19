#!/usr/bin/env bash
# Quick-run script for the Marvel intro generator.
# Edit IMAGE to point at your Marvel Studios logo file.

IMAGE="marvel_logo.png"   # <-- your image here
OUTPUT="marvel_intro.mp4"

# 480p  (~16GB VRAM)   — fast, good for iterating on the prompt
# 720p  (~24GB+ VRAM)  — cinematic quality, slower

python marvel_intro_generator.py \
  --image "$IMAGE" \
  --output "$OUTPUT" \
  --resolution 480p \
  --num-frames 81 \
  --fps 16 \
  --guidance-scale 5.0 \
  --steps 50 \
  --seed 42

# Uncomment for 720p cinematic quality:
# python marvel_intro_generator.py \
#   --image "$IMAGE" \
#   --output "$OUTPUT" \
#   --resolution 720p \
#   --num-frames 81 \
#   --fps 16 \
#   --guidance-scale 5.5 \
#   --steps 50 \
#   --seed 42

# Uncomment for lower-VRAM machines (~12GB) with CPU offload:
# python marvel_intro_generator.py \
#   --image "$IMAGE" \
#   --output "$OUTPUT" \
#   --resolution 480p \
#   --offload \
#   --steps 40 \
#   --seed 42
