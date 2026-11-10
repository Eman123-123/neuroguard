"""Generates realistic synthetic axial brain MRI scans representing each of the 4 classes:
1. Non-Demented (Normal Control)
2. Very Mild Demented
3. Mild Demented
4. Moderate Demented

Saved to neuroguard/ml/sample_scans/ for immediate web app testing.
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCANS_DIR = os.path.join(os.path.dirname(__file__), "sample_scans")
os.makedirs(SCANS_DIR, exist_ok=True)


def create_synthetic_axial_mri(severity_stage: int) -> Image.Image:
    """Create an anatomically realistic synthetic axial T1-weighted brain MRI slice.
    severity_stage: 0 (Normal), 1 (Very Mild), 2 (Mild), 3 (Moderate)
    """
    w, h = 256, 256
    img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(img)

    cx, cy = w // 2, h // 2
    rx, ry = 92, 108

    # 1. Outer Skull Rim (Bright cortical bone)
    draw.ellipse([cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + ry + 4], fill=220)
    # Diploe / soft tissue
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=40)

    # 2. Brain Parenchyma (Gray/White matter)
    # Parenchyma shrinks slightly with disease severity
    p_shrink = [0, 4, 8, 14][severity_stage]
    draw.ellipse([cx - rx + 6 + p_shrink, cy - ry + 6 + p_shrink, cx + rx - 6 - p_shrink, cy + ry - 6 - p_shrink], fill=145)

    # 3. Sulcal / Cortical Fold Infoldings (Atrophy causes deeper, wider crevices)
    np.random.seed(42 + severity_stage)
    n_sulci = [12, 18, 28, 42][severity_stage]
    for _ in range(n_sulci):
        angle = np.random.uniform(0, 2 * np.pi)
        depth = np.random.uniform(10, 22 + severity_stage * 8)
        width = 2 + severity_stage
        px = cx + (rx - 10) * np.cos(angle)
        py = cy + (ry - 10) * np.sin(angle)
        ex = cx + (rx - 10 - depth) * np.cos(angle)
        ey = cy + (ry - 10 - depth) * np.sin(angle)
        draw.line([px, py, ex, ey], fill=30, width=width)

    # 4. Lateral Ventricles (CSF - Hypointense dark spaces in center)
    # Normal: Thin slit/horns. Severe: Massive enlargement (hydrocephalus ex vacuo).
    vw = [12, 22, 38, 54][severity_stage]
    vh = [24, 38, 58, 80][severity_stage]
    
    # Left lateral ventricle
    draw.ellipse([cx - vw - 6, cy - vh // 2 - 4, cx - 4, cy + vh // 2], fill=20)
    # Right lateral ventricle
    draw.ellipse([cx + 4, cy - vh // 2 - 4, cx + vw + 6, cy + vh // 2], fill=20)

    # Third ventricle slit
    draw.line([cx, cy - vh // 3, cx, cy + vh // 3], fill=20, width=max(2, severity_stage * 2))

    # 5. Temporal Horns / Hippocampal Fissure
    if severity_stage >= 1:
        th_w = 4 + severity_stage * 4
        draw.ellipse([cx - rx // 2 - th_w, cy + 24, cx - rx // 2 + th_w, cy + 40], fill=25)
        draw.ellipse([cx + rx // 2 - th_w, cy + 24, cx + rx // 2 + th_w, cy + 40], fill=25)

    # Apply realistic Gaussian tissue smoothing & noise
    img = img.filter(ImageFilter.GaussianBlur(radius=1.2))

    # Add subtle MRI acquisition noise
    arr = np.array(img).astype(np.float32)
    noise = np.random.normal(0, 5.0, arr.shape)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)

    return Image.fromarray(arr)


def generate_all_sample_scans():
    class_names = [
        ("non_demented_normal.jpg", 0, "Non-Demented (Control)"),
        ("very_mild_mci.jpg", 1, "Very Mild Demented (MCI)"),
        ("mild_alzheimers.jpg", 2, "Mild Demented (Early AD)"),
        ("moderate_alzheimers.jpg", 3, "Moderate Demented (Advanced AD)"),
    ]

    print("Generating synthetic benchmark MRI scans...")
    for filename, stage, desc in class_names:
        img = create_synthetic_axial_mri(stage)
        filepath = os.path.join(SCANS_DIR, filename)
        img.save(filepath, quality=95)
        print(f"  Created: {filename} -> {desc}")


if __name__ == "__main__":
    generate_all_sample_scans()
