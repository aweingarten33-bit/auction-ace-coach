#!/usr/bin/env bash
# Quick-run script for the Marvel intro generator.
# Edit IMAGE to point at your Marvel Studios logo file.

# Drop your image file next to this script and set the name below.
# The image should be the "Bro, We're Senior Citizens FF League" logo.
IMAGE="bro_we_are_senior_citizens.png"   # <-- rename to match your actual filename
OUTPUT="bro_ff_league_intro.mp4"

# ── Style options ────────────────────────────────────────────────────────────
# --prompt-style sweep  → NFL panels light up + red sweep + camera push-in
#                          (more reliable, great first result)
# --prompt-style flip   → Panels peel/flip like the real Marvel intro
#                          (more ambitious, may need seed tuning)
# ─────────────────────────────────────────────────────────────────────────────

# OPTION 1: 480p sweep — fastest, good for testing (~16GB VRAM)
python marvel_intro_generator.py \
  --image "$IMAGE" \
  --output "$OUTPUT" \
  --resolution 480p \
  --prompt-style sweep \
  --num-frames 81 \
  --fps 16 \
  --guidance-scale 5.5 \
  --steps 50 \
  --seed 42

# OPTION 2: 480p flip style (uncomment to try)
# python marvel_intro_generator.py \
#   --image "$IMAGE" \
#   --output "bro_ff_flip_intro.mp4" \
#   --resolution 480p \
#   --prompt-style flip \
#   --num-frames 81 \
#   --fps 16 \
#   --guidance-scale 6.0 \
#   --steps 50 \
#   --seed 42

# OPTION 3: 720p cinematic quality (~24GB+ VRAM)
# python marvel_intro_generator.py \
#   --image "$IMAGE" \
#   --output "bro_ff_league_intro_720p.mp4" \
#   --resolution 720p \
#   --prompt-style sweep \
#   --num-frames 81 \
#   --fps 16 \
#   --guidance-scale 5.5 \
#   --steps 50 \
#   --seed 42

# OPTION 4: Low-VRAM CPU offload (~12GB GPU)
# python marvel_intro_generator.py \
#   --image "$IMAGE" \
#   --output "$OUTPUT" \
#   --resolution 480p \
#   --prompt-style sweep \
#   --offload \
#   --steps 40 \
#   --seed 42
