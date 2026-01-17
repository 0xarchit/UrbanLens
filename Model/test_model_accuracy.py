from pathlib import Path
import torch
from ultralytics import YOLO

BASE_DIR = Path(r"D:\B.Tech\ProjeX\18 City Issue")
MODEL_DIR = BASE_DIR / "Model"
MERGED_DIR = BASE_DIR / "Dataset_Merged"

best_model_path = MODEL_DIR / "urban_issues_yolov8" / "weights" / "best.pt"
data_yaml_path = MERGED_DIR / "data.yaml"


def main() -> None:
    if torch.cuda.is_available():
        device = 0
    else:
        device = "cpu"

    model = YOLO(str(best_model_path))

    results = model.val(
        data=str(data_yaml_path),
        split="test",
        imgsz=640,
        batch=16,
        device=device,
        save_json=True,
        plots=False,
        workers=0,
    )

    map50 = float(results.box.map50) * 100.0
    map50_95 = float(results.box.map) * 100.0
    precision = float(results.box.mp) * 100.0
    recall = float(results.box.mr) * 100.0

    print(f"mAP@0.50: {map50:.2f}%")
    print(f"mAP@0.50:0.95: {map50_95:.2f}%")
    print(f"Precision: {precision:.2f}%")
    print(f"Recall: {recall:.2f}%")


if __name__ == "__main__":
    main()
