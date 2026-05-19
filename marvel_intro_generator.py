"""
Fantasy Football League Marvel-Style Intro Generator
Uses Wan2.1 Image-to-Video (I2V) to animate the "Bro, We're Senior Citizens FF League"
logo into a Marvel Studios-style cinematic intro sequence.

The input image already mirrors the Marvel intro layout:
  - NFL team logo panels arranged in a hero-grid
  - Diagonal film strips running across corners
  - Dramatic crimson atmospheric lighting
  - Metallic centre title text

Requirements:
    pip install torch torchvision diffusers transformers accelerate Pillow

GPU: 24GB+ VRAM recommended for 720P. Use 480P or --offload flags for smaller GPUs.
Model will auto-download on first run (~30GB for 14B).
"""

import torch
from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
from diffusers.utils import export_to_video, load_image
from transformers import CLIPVisionModel
from PIL import Image
import argparse
import sys
import os


# ---------------------------------------------------------------------------
# Prompt tuned specifically for the "Bro, We're Senior Citizens FF League" image:
#
# The image already has the Marvel intro layout — NFL logo panels in a hero
# grid, diagonal film strips in the corners, deep crimson lighting, metallic
# centre text. The prompt drives the I2V model to ANIMATE those elements:
#   1. Each NFL logo panel lights up and pulses in rapid succession
#   2. Film strips scroll diagonally with motion blur
#   3. Red atmospheric light sweeps across the frame
#   4. Camera slow-pushes into the centre title with a metallic gleam
#   5. Cinematic lens flare bursts from the corner highlights
# ---------------------------------------------------------------------------
MARVEL_INTRO_PROMPT = (
    "Cinematic Marvel Studios-style intro animation. The grid of NFL team logo panels "
    "illuminates one by one in rapid succession, each emblem glowing with deep crimson "
    "light and a metallic sheen, pulsing in a quick staccato rhythm. The diagonal film "
    "strips in the corners scroll and roll with motion blur, frames flickering past. "
    "A dramatic red atmospheric light sweeps slowly across the entire frame from left "
    "to right. The camera performs a smooth slow push-in toward the bold silver metallic "
    "centre title 'BRO, WE'RE SENIOR CITIZENS FF LEAGUE', which catches the light with "
    "a gleaming specular highlight. Crimson lens flare bursts from the corner panel edges. "
    "Epic cinematic score atmosphere, shallow depth of field, high contrast dramatic "
    "lighting, IMAX quality motion, 24fps film grain, photorealistic."
)

# Alternative prompt — tries to get the panels to flip/peel like real Marvel intro
MARVEL_INTRO_PROMPT_FLIP = (
    "Marvel Studios intro sequence recreation. Starting from a grid of NFL team logo "
    "panels on a deep crimson background, each panel rapidly flips and peels away like "
    "pages in a flip-book, revealing glowing crimson light beneath. Film strips in the "
    "corners whip past with motion blur. After the panels flip through in quick succession "
    "the camera dramatically pushes in toward the bold metallic centrepiece title "
    "'BRO, WE'RE SENIOR CITIZENS FF LEAGUE' which shimmers with a sweeping specular "
    "highlight. Dramatic red lens flare, cinematic depth of field, IMAX quality, "
    "high contrast lighting, 24fps."
)

NEGATIVE_PROMPT = (
    "blurry, low quality, watermark, text overlay, distorted logo, "
    "shaky camera, overexposed, static image, no motion"
)


def build_pipeline(model_resolution: str, offload: bool) -> WanImageToVideoPipeline:
    if model_resolution == "720p":
        model_id = "Wan-AI/Wan2.1-I2V-14B-720P-Diffusers"
    else:
        model_id = "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"

    print(f"Loading model: {model_id}")
    print("(First run will download ~30GB — subsequent runs use cache)\n")

    image_encoder = CLIPVisionModel.from_pretrained(
        model_id,
        subfolder="image_encoder",
        torch_dtype=torch.float32,
    )
    vae = AutoencoderKLWan.from_pretrained(
        model_id,
        subfolder="vae",
        torch_dtype=torch.float32,
    )
    pipe = WanImageToVideoPipeline.from_pretrained(
        model_id,
        vae=vae,
        image_encoder=image_encoder,
        torch_dtype=torch.bfloat16,
    )

    if offload:
        pipe.enable_model_cpu_offload()
        print("CPU offload enabled — slower but uses less VRAM.\n")
    else:
        pipe.to("cuda")

    return pipe


def generate(args):
    if not os.path.exists(args.image):
        sys.exit(f"Image not found: {args.image}")

    # Load and optionally resize the input image
    image = load_image(args.image)
    w, h = image.size

    if args.resolution == "720p":
        target_w, target_h = 1280, 720
    else:
        target_w, target_h = 854, 480

    # Maintain aspect ratio with a centre-crop to target resolution
    scale = max(target_w / w, target_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    image = image.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    image = image.crop((left, top, left + target_w, top + target_h))

    print(f"Input image resized to {target_w}x{target_h}")

    pipe = build_pipeline(args.resolution, args.offload)

    if args.prompt:
        prompt = args.prompt
    elif getattr(args, "prompt_style", "sweep") == "flip":
        prompt = MARVEL_INTRO_PROMPT_FLIP
    else:
        prompt = MARVEL_INTRO_PROMPT
    print(f"Prompt:\n{prompt}\n")
    print(f"Generating {args.num_frames} frames at {args.fps}fps "
          f"({args.num_frames / args.fps:.1f}s video)...\n")

    output = pipe(
        image=image,
        prompt=prompt,
        negative_prompt=NEGATIVE_PROMPT,
        height=target_h,
        width=target_w,
        num_frames=args.num_frames,
        guidance_scale=args.guidance_scale,
        num_inference_steps=args.steps,
        generator=torch.Generator("cuda").manual_seed(args.seed) if args.seed else None,
    ).frames[0]

    export_to_video(output, args.output, fps=args.fps)
    print(f"\nVideo saved to: {args.output}")


def main():
    parser = argparse.ArgumentParser(
        description="Animate 'Bro We're Senior Citizens FF League' image into a Marvel-style intro using Wan2.1 I2V"
    )
    parser.add_argument(
        "--image",
        default="bro_we_are_senior_citizens.png",
        help="Path to your FF league logo image (PNG/JPG)",
    )
    parser.add_argument(
        "--output",
        default="marvel_intro.mp4",
        help="Output video path",
    )
    parser.add_argument(
        "--resolution",
        choices=["720p", "480p"],
        default="480p",
        help="Output resolution. 720p needs 24GB+ VRAM; 480p works on ~16GB.",
    )
    parser.add_argument(
        "--num-frames",
        type=int,
        default=81,
        help="Number of frames to generate (81 = ~5s at 16fps)",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=16,
        help="Frames per second for the exported video",
    )
    parser.add_argument(
        "--guidance-scale",
        type=float,
        default=5.0,
        help="How strongly the model follows the prompt (4-7 works well)",
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=50,
        help="Inference steps — higher = better quality, slower generation",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (0 = random)",
    )
    parser.add_argument(
        "--offload",
        action="store_true",
        help="Enable CPU offload to save VRAM (slower but runs on 12GB GPUs)",
    )
    parser.add_argument(
        "--prompt",
        type=str,
        default=None,
        help="Override the built-in prompt with your own text",
    )
    parser.add_argument(
        "--prompt-style",
        choices=["sweep", "flip"],
        default="sweep",
        dest="prompt_style",
        help=(
            "'sweep' = light sweep + panel glow (default, more reliable). "
            "'flip' = panels peel and flip like real Marvel intro (more ambitious)."
        ),
    )

    args = parser.parse_args()
    if args.seed == 0:
        args.seed = None

    generate(args)


if __name__ == "__main__":
    main()
