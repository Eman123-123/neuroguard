import os
from neuroguard.ml.mri_predictor import get_mri_predictor

def test_samples():
    predictor = get_mri_predictor()
    scans_dir = os.path.join(os.path.dirname(__file__), "sample_scans")
    
    for fname in sorted(os.listdir(scans_dir)):
        if fname.endswith(".jpg"):
            path = os.path.join(scans_dir, fname)
            res = predictor.predict_image(path)
            print(f"{fname:30s} -> Predicted: {res['predicted_class']:22s} | Conf: {res['confidence']*100:5.1f}% | VBR: {res['ventricle_to_brain_ratio']} | Heatmap len: {len(res['heatmap_image'])}")

if __name__ == "__main__":
    test_samples()
