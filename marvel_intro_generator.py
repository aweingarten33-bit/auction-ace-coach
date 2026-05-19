"""
Marvel Studios Intro Animation Generator
Uses Wan2.1 Image-to-Video (I2V) to animate a Marvel Studios logo image
into a cinematic comic-book-flip intro sequence.

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
# Prompt crafted to replicate the Marvel Studios flip-book intro:
#   - Rapid comic-book pages cascade across the frame in crimson tones
#   - Vintage halftone panels flash heroes in mid-action
#   - Pages peel and whip away to reveal the Marvel Studios logo
#   - Bold zoom-in push, lens-flare, cinematic depth of field
# ---------------------------------------------------------------------------
MARVEL_INTRO_PROMPT = (
    "Cinematic Marvel Studios intro sequence. Dozens of vintage red-tinted comic book "
    "pages rapidly flip and cascade across the frame, each panel showing ink-drawn "
    "superhero action poses rendered in classic halftone print style. Pages whip past "
    "in quick succession with motion blur, creating a dynamic flipping book effect. "
    "The crimson-filtered pages peel away one by one to reveal the bold Marvel Studios "
    "red logo centred on a clean white background. Camera pushes in with a slow zoom, "
    "dramatic lens flare streaks across the logo, shallow depth of field, high contrast "
    "cinematic lighting, IMAX quality, photorealistic motion, 24fps film grain."
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

    prompt = args.prompt or MARVEL_INTRO_PROMPT
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
        description="Animate a Marvel Studios logo image into a cinematic intro using Wan2.1 I2V"
    )
    parser.add_argument(
        "--image",
        default="marvel_logo.png",
        help="Path to your Marvel Studios logo image (PNG/JPG)",
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
        help="Override the default Marvel intro prompt with your own",
    )

    args = parser.parse_args()
    if args.seed == 0:
        args.seed = None

    generate(args)


if __name__ == "__main__":
    main()
