"""MRI inference engine (4-class: Non / Very mild / Mild / Moderate demented).

HONESTY GATE
------------
No trained weights ship with this repository (`saved_models/resnet50_baseline.pt`
does not exist). The previous implementation answered anyway, using hand-written
pixel-intensity thresholds with hard-coded class probabilities and a fixed
"Grad-CAM" drawn at the same place on every image. That fabricated clinical
output and has been removed. Now:

* without weights  -> `ModelUnavailableError` (API returns HTTP 503), no result.
* with weights     -> a real forward pass and a real Grad-CAM (gradients of the
                      predicted-class logit w.r.t. the last ResNet block).

Even with weights, a model trained on the Kaggle 4-class JPEG set must not be
treated as clinically meaningful: that set's subject-level splitting cannot be
verified and slice-level splits inflate accuracy (see docs/AUDIT_REPORT.md). Train on a properly
licensed dataset (OASIS-1/3, ADNI) with subject-level splits and external validation.
"""
from __future__ import annotations

import base64
import io
import os

import numpy as np
from PIL import Image

MRI_CLASSES = ["Non-Demented", "Very Mild Demented", "Mild Demented", "Moderate Demented"]
WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models", "resnet50_baseline.pt")
MAX_PIXELS = 4096 * 4096


class ModelUnavailableError(RuntimeError):
    pass


class MRINeuroimagingPredictor:
    def __init__(self, weights_path: str = WEIGHTS_PATH):
        self.weights_path = weights_path
        self.classes = MRI_CLASSES
        self.torch_model = None
        self.unavailable_reason = None
        self._load()

    @property
    def available(self) -> bool:
        return self.torch_model is not None

    def status(self) -> dict:
        return {
            "available": self.available,
            "reason": None if self.available else self.unavailable_reason,
            "classes": self.classes,
            "validated": False,
            "note": "No MRI result is produced unless a trained model is present. Even then it is unvalidated research output.",
        }

    def _load(self):
        if not os.path.exists(self.weights_path):
            self.unavailable_reason = "No trained MRI model weights found (saved_models/resnet50_baseline.pt). Train with mri_baseline.py on a properly licensed dataset."
            return
        try:
            import torch
            import torch.nn as nn
            from torchvision import models

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = models.resnet50(weights=None)
            model.fc = nn.Linear(model.fc.in_features, len(self.classes))
            model.load_state_dict(torch.load(self.weights_path, map_location=device, weights_only=True))
            model.to(device).eval()
            self.torch_model, self.torch_device = model, device
        except Exception as exc:  # torch missing, corrupt file, class-count mismatch...
            self.torch_model = None
            self.unavailable_reason = f"MRI model could not be loaded: {type(exc).__name__}: {exc}"

    # ------------------------------------------------------------------ #
    @staticmethod
    def _open(image_input) -> Image.Image:
        if isinstance(image_input, (str, os.PathLike)):
            img = Image.open(image_input)
        elif isinstance(image_input, (bytes, bytearray)):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            img = image_input
        else:
            raise ValueError("Unsupported image input type")
        if img.width * img.height > MAX_PIXELS:
            raise ValueError("Image too large")
        img.load()
        return img

    def predict_image(self, image_input) -> dict:
        if not self.available:
            raise ModelUnavailableError(self.unavailable_reason)
        import torch
        from torchvision import transforms

        img = self._open(image_input).convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        tf = transforms.Compose([transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
        x = tf(img).unsqueeze(0).to(self.torch_device)

        # Real Grad-CAM on the last residual stage
        acts, grads = {}, {}
        layer = self.torch_model.layer4
        h1 = layer.register_forward_hook(lambda m, i, o: acts.__setitem__("a", o))
        h2 = layer.register_full_backward_hook(lambda m, gi, go: grads.__setitem__("g", go[0]))
        try:
            self.torch_model.zero_grad()
            logits = self.torch_model(x)
            probs = torch.softmax(logits, dim=1)[0].detach().cpu().numpy()
            idx = int(np.argmax(probs))
            logits[0, idx].backward()
            w = grads["g"].mean(dim=(2, 3), keepdim=True)
            cam = torch.relu((w * acts["a"]).sum(dim=1, keepdim=True))
            cam = torch.nn.functional.interpolate(cam, size=(224, 224), mode="bilinear", align_corners=False)[0, 0]
            cam = cam.detach().cpu().numpy()
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        finally:
            h1.remove()
            h2.remove()

        heat = self._overlay(img, cam)
        return {
            "predicted_class": self.classes[idx],
            "class_code": idx,
            "severity_code": ["NORMAL", "VERY_MILD", "MILD", "MODERATE"][idx],
            "confidence": round(float(probs[idx]), 4),
            "class_probabilities": {n: round(float(p), 4) for n, p in zip(self.classes, probs)},
            "ventricle_to_brain_ratio": None,
            "biomarkers_detected": [],
            "clinical_recommendation": "Research-grade, unvalidated image model output. Not a diagnosis; requires radiologist/neurologist review.",
            "heatmap_image": heat,
            "disclaimer": "Unvalidated research model. Definitive assessment requires clinical evaluation and expert image review.",
        }

    @staticmethod
    def _overlay(img: Image.Image, cam: np.ndarray) -> str:
        import matplotlib

        matplotlib.use("Agg")
        from matplotlib import cm

        base = np.asarray(img).astype(np.float32)
        color = (cm.jet(cam)[..., :3] * 255).astype(np.float32)
        out = (0.55 * base + 0.45 * color).clip(0, 255).astype(np.uint8)
        buf = io.BytesIO()
        Image.fromarray(out).save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


_instance = None


def get_mri_predictor() -> MRINeuroimagingPredictor:
    global _instance
    if _instance is None:
        _instance = MRINeuroimagingPredictor()
    return _instance
