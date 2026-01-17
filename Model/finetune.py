"""
================================================================================
FINE-TUNING CODE FOR HIGH ACCURACY MODEL (Target: 90% mAP50)
================================================================================
Run from terminal: python finetune.py
================================================================================
"""

from ultralytics import YOLO
from pathlib import Path
import torch
import multiprocessing

def main():
    BASE_DIR = Path(r"D:\B.Tech\ProjeX\18 City Issue")
    MERGED_DIR = BASE_DIR / "Dataset_Merged"
    MODEL_DIR = BASE_DIR / "Model"

    DEVICE = 0 if torch.cuda.is_available() else "cpu"
    print(f"Device: {DEVICE}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

    BEST_MODEL_PATH = MODEL_DIR / "urban_issues_yolov8" / "weights" / "best.pt"

    if BEST_MODEL_PATH.exists():
        print(f"Found baseline model: {BEST_MODEL_PATH}")
        print("Will fine-tune from your trained weights...")
        model = YOLO(str(BEST_MODEL_PATH))
    else:
        print("No baseline found. Starting fresh with YOLOv8-Medium...")
        model = YOLO("yolov8m.pt")

    results = model.train(
        data=str(MERGED_DIR / "data.yaml"),
        
        epochs=50,
        imgsz=736,
        batch=8,
        
        patience=20,
        save=True,
        project=str(MODEL_DIR),
        name="urban_issues_aggressive_finetune",
        exist_ok=True,
        
        pretrained=True,
        optimizer="AdamW",
        lr0=0.001,
        momentum=0.9,
        
        mosaic=1.0,
        mixup=0.1,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        warmup_bias_lr=0.1,
        
        cos_lr=True,
        
        device=DEVICE,
        workers=4,
        cache=False,
        
        verbose=True,
        seed=42,
        deterministic=False,
        plots=True,
        save_period=10,
        val=True,
        
        close_mosaic=5,
        amp=True,
        rect=False,
        multi_scale=False,
    )

    print("\n" + "="*60)
    print("HIGH ACCURACY TRAINING COMPLETED!")
    print("="*60)
    print(f"Best model: {MODEL_DIR / 'urban_issues_high_accuracy' / 'weights' / 'best.pt'}")

    final_model = YOLO(str(MODEL_DIR / "urban_issues_high_accuracy" / "weights" / "best.pt"))
    val_results = final_model.val(data=str(MERGED_DIR / "data.yaml"), split="val")

    print("\n" + "="*60)
    print("FINAL VALIDATION RESULTS")
    print("="*60)
    print(f"mAP50:    {val_results.box.map50:.4f}")
    print(f"mAP50-95: {val_results.box.map:.4f}")
    print(f"Precision: {val_results.box.p.mean():.4f}")
    print(f"Recall:    {val_results.box.r.mean():.4f}")


if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
