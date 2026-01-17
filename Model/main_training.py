"""
================================================================================
YOLO MODEL TRAINING PIPELINE FOR URBAN ISSUES DETECTION
================================================================================
Autonomous City Issue Resolution Agent (GovTech)

This file is divided into sections. Copy each section into a separate 
Jupyter Notebook cell and run sequentially.

Classes:
    0: Damaged Road Issues
    1: Pothole Issues  
    2: Illegal Parking Issues
    3: Broken Road Sign Issues
    4: Fallen Trees
    5: Littering/Garbage on Public Places
    6: Vandalism Issues
    7: Dead Animal Pollution
    8: Damaged Concrete Structures
    9: Damaged Electric Wires and Poles
================================================================================
"""


"""
================================================================================
SECTION 1: IMPORTS AND SETUP
================================================================================
"""
import os
import shutil
import yaml
import random
from pathlib import Path
from tqdm import tqdm
import matplotlib.pyplot as plt
import numpy as np
import cv2
from PIL import Image
import pandas as pd
import seaborn as sns
from ultralytics import YOLO
import torch

BASE_DIR = Path(r"D:\B.Tech\ProjeX\18 City Issue")
DATASET_DIR = BASE_DIR / "Dataset"
MODEL_DIR = BASE_DIR / "Model"
MERGED_DIR = BASE_DIR / "Dataset_Merged"

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    DEVICE = 0
else:
    print("\n[!] GPU NOT DETECTED - Training will use CPU (SLOW)")
    print("    To fix: Run these commands in terminal:")
    print("    pip uninstall torch torchvision -y")
    print("    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
    DEVICE = "cpu"

print(f"\nBase directory: {BASE_DIR}")
print(f"Device: {DEVICE}")


"""
================================================================================
SECTION 2: DATASET CONFIGURATION
================================================================================
"""
CLASS_NAMES = {
    0: "Damaged Road Issues",
    1: "Pothole Issues",
    2: "Illegal Parking Issues",
    3: "Broken Road Sign Issues",
    4: "Fallen Trees",
    5: "Littering/Garbage on Public Places",
    6: "Vandalism Issues",
    7: "Dead Animal Pollution",
    8: "Damaged Concrete Structures",
    9: "Damaged Electric Wires and Poles"
}

DATASET_MAPPING = {
    "Potholes and RoadCracks/Potholes and RoadCracks": {
        "class_map": {1: 1},
        "name": "Potholes"
    },
    "Garbage/Garbage": {
        "class_map": {5: 5},
        "name": "Garbage"
    },
    "FallenTrees/FallenTrees": {
        "class_map": {4: 4},
        "name": "FallenTrees"
    },
    "DamagedElectricalPoles/DamagedElectricalPoles": {
        "class_map": {9: 9},
        "name": "DamagedElectricalPoles"
    },
    "Damaged concrete structures/Damaged concrete structures": {
        "class_map": {8: 8},
        "name": "DamagedConcrete"
    },
    "DamagedRoadSigns/DamagedRoadSigns": {
        "class_map": {0: 3, 1: 3},
        "name": "DamagedRoadSigns"
    },
    "DeadAnimalsPollution/DeadAnimalsPollution": {
        "class_map": {7: 7},
        "name": "DeadAnimals"
    },
    "Graffitti/Graffitti": {
        "class_map": {6: 6},
        "name": "Graffiti"
    },
    "IllegalParking/IllegalParking": {
        "class_map": {0: 2, 1: 2, 2: 2},
        "name": "IllegalParking"
    }
}

print(f"Total classes: {len(CLASS_NAMES)}")
for idx, name in CLASS_NAMES.items():
    print(f"  {idx}: {name}")


"""
================================================================================
SECTION 3: CREATE MERGED DATASET DIRECTORY STRUCTURE
================================================================================
"""
def create_merged_dataset_structure():
    for split in ["train", "valid", "test"]:
        (MERGED_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (MERGED_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)
    print(f"Created merged dataset structure at: {MERGED_DIR}")

create_merged_dataset_structure()


"""
================================================================================
SECTION 4: MERGE AND RELABEL DATASETS
================================================================================
"""
def relabel_annotation(label_path, class_map, is_segmentation=False):
    if not label_path.exists():
        return None
    
    with open(label_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        parts = line.split()
        if len(parts) < 5:
            continue
            
        old_class = int(parts[0])
        if old_class not in class_map:
            continue
            
        new_class = class_map[old_class]
        new_line = str(new_class) + " " + " ".join(parts[1:])
        new_lines.append(new_line)
    
    return new_lines if new_lines else None

def merge_datasets():
    stats = {split: {cls: 0 for cls in CLASS_NAMES.keys()} for split in ["train", "valid", "test"]}
    
    for dataset_path, config in tqdm(DATASET_MAPPING.items(), desc="Merging datasets"):
        dataset_full_path = DATASET_DIR / dataset_path
        class_map = config["class_map"]
        dataset_name = config["name"]
        
        for split in ["train", "valid", "test"]:
            images_dir = dataset_full_path / split / "images"
            labels_dir = dataset_full_path / split / "labels"
            
            if not images_dir.exists():
                print(f"Skipping {dataset_name}/{split} - images not found")
                continue
            
            image_files = list(images_dir.glob("*.[jJ][pP][gG]")) + \
                         list(images_dir.glob("*.[jJ][pP][eE][gG]")) + \
                         list(images_dir.glob("*.[pP][nN][gG]"))
            
            for img_path in image_files:
                label_name = img_path.stem + ".txt"
                label_path = labels_dir / label_name
                
                new_lines = relabel_annotation(label_path, class_map)
                if new_lines is None:
                    continue
                
                new_img_name = f"{dataset_name}_{img_path.name}"
                new_label_name = f"{dataset_name}_{img_path.stem}.txt"
                
                dst_img = MERGED_DIR / "images" / split / new_img_name
                dst_label = MERGED_DIR / "labels" / split / new_label_name
                
                shutil.copy2(img_path, dst_img)
                
                with open(dst_label, 'w') as f:
                    f.write('\n'.join(new_lines))
                
                for line in new_lines:
                    cls = int(line.split()[0])
                    stats[split][cls] += 1
    
    return stats

print("Merging datasets...")
stats = merge_datasets()

print("\n Dataset Statistics:")
for split, class_stats in stats.items():
    total = sum(class_stats.values())
    print(f"\n{split.upper()}: {total} annotations")
    for cls, count in class_stats.items():
        if count > 0:
            print(f"  {cls}: {CLASS_NAMES[cls]} - {count}")


"""
================================================================================
SECTION 5: GENERATE DATA.YAML CONFIG FILE
================================================================================
"""
data_yaml = {
    "path": str(MERGED_DIR),
    "train": "images/train",
    "val": "images/valid",
    "test": "images/test",
    "nc": len(CLASS_NAMES),
    "names": list(CLASS_NAMES.values())
}

yaml_path = MERGED_DIR / "data.yaml"
with open(yaml_path, 'w') as f:
    yaml.dump(data_yaml, f, default_flow_style=False)

print(f"Created data.yaml at: {yaml_path}")
print("\nContents:")
with open(yaml_path, 'r') as f:
    print(f.read())


"""
================================================================================
SECTION 6: VALIDATE DATASET INTEGRITY
================================================================================
"""
def validate_dataset():
    issues = []
    
    for split in ["train", "valid", "test"]:
        images_dir = MERGED_DIR / "images" / split
        labels_dir = MERGED_DIR / "labels" / split
        
        image_files = list(images_dir.glob("*"))
        label_files = list(labels_dir.glob("*.txt"))
        
        image_stems = {f.stem for f in image_files}
        label_stems = {f.stem for f in label_files}
        
        missing_labels = image_stems - label_stems
        missing_images = label_stems - image_stems
        
        if missing_labels:
            issues.append(f"{split}: {len(missing_labels)} images missing labels")
        if missing_images:
            issues.append(f"{split}: {len(missing_images)} labels missing images")
        
        print(f"{split}: {len(image_files)} images, {len(label_files)} labels")
    
    if issues:
        print("\n Issues found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\n All files validated successfully!")
    
    return len(issues) == 0

validate_dataset()


"""
================================================================================
SECTION 7: VISUALIZE SAMPLE IMAGES WITH ANNOTATIONS
================================================================================
"""
def visualize_samples(n_samples=6):
    train_images = list((MERGED_DIR / "images" / "train").glob("*"))
    sample_images = random.sample(train_images, min(n_samples, len(train_images)))
    
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.flatten()
    
    colors = plt.cm.tab10(np.linspace(0, 1, 10))
    
    for idx, img_path in enumerate(sample_images):
        img = cv2.imread(str(img_path))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        
        label_path = MERGED_DIR / "labels" / "train" / (img_path.stem + ".txt")
        
        if label_path.exists():
            with open(label_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        cls = int(parts[0])
                        
                        if len(parts) == 5:
                            cx, cy, bw, bh = map(float, parts[1:5])
                            x1 = int((cx - bw/2) * w)
                            y1 = int((cy - bh/2) * h)
                            x2 = int((cx + bw/2) * w)
                            y2 = int((cy + bh/2) * h)
                        else:
                            coords = list(map(float, parts[1:]))
                            xs = [coords[i] * w for i in range(0, len(coords), 2)]
                            ys = [coords[i] * h for i in range(1, len(coords), 2)]
                            x1, x2 = int(min(xs)), int(max(xs))
                            y1, y2 = int(min(ys)), int(max(ys))
                        
                        color = tuple(int(c * 255) for c in colors[cls][:3])
                        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(img, CLASS_NAMES[cls][:15], (x1, y1-5), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        axes[idx].imshow(img)
        axes[idx].set_title(img_path.name[:30])
        axes[idx].axis('off')
    
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "sample_annotations.png", dpi=150)
    plt.show()
    print(f"Saved sample visualization to: {MODEL_DIR / 'sample_annotations.png'}")

visualize_samples()


"""
================================================================================
SECTION 8: TRAIN YOLO MODEL
================================================================================
"""
model = YOLO("yolov8n.pt")

results = model.train(
    data=str(MERGED_DIR / "data.yaml"),
    epochs=100,
    imgsz=640,
    batch=16,
    patience=20,
    save=True,
    project=str(MODEL_DIR),
    name="urban_issues_yolov8",
    exist_ok=True,
    pretrained=True,
    optimizer="auto",
    verbose=True,
    seed=42,
    deterministic=True,
    plots=True,
    save_period=10,
    val=True,
    device=DEVICE,
    cache=False
)

print("\nTraining completed!")
print(f"Best model saved at: {MODEL_DIR / 'urban_issues_yolov8' / 'weights' / 'best.pt'}")


"""
================================================================================
SECTION 9: EVALUATE MODEL ON VALIDATION SET
================================================================================
"""
best_model_path = MODEL_DIR / "urban_issues_yolov8" / "weights" / "best.pt"
model = YOLO(str(best_model_path))

val_results = model.val(
    data=str(MERGED_DIR / "data.yaml"),
    split="val",
    save_json=True,
    plots=True
)

print("\nValidation Results:")
print(f"mAP50: {val_results.box.map50:.4f}")
print(f"mAP50-95: {val_results.box.map:.4f}")
print(f"Precision: {val_results.box.mp:.4f}")
print(f"Recall: {val_results.box.mr:.4f}")


"""
================================================================================
SECTION 10: RUN INFERENCE ON TEST SET
================================================================================
"""
test_images_dir = MERGED_DIR / "images" / "test"
test_images = list(test_images_dir.glob("*"))[:20]

results = model.predict(
    source=test_images,
    save=True,
    save_txt=True,
    project=str(MODEL_DIR),
    name="test_predictions",
    exist_ok=True,
    conf=0.25,
    iou=0.45
)

print(f"\nTest predictions saved to: {MODEL_DIR / 'test_predictions'}")

for r in results[:3]:
    print(f"\nImage: {Path(r.path).name}")
    if r.boxes is not None:
        for box in r.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            print(f"  - {CLASS_NAMES[cls]}: {conf:.2f}")


"""
================================================================================
SECTION 11: GENERATE CONFUSION MATRIX AND ANALYSIS
================================================================================
"""
confusion_matrix_path = MODEL_DIR / "urban_issues_yolov8" / "confusion_matrix.png"
if confusion_matrix_path.exists():
    img = Image.open(confusion_matrix_path)
    plt.figure(figsize=(12, 10))
    plt.imshow(img)
    plt.axis('off')
    plt.title("Confusion Matrix")
    plt.tight_layout()
    plt.show()
else:
    print("Confusion matrix not found. Will be generated after training.")

results_csv = MODEL_DIR / "urban_issues_yolov8" / "results.csv"
if results_csv.exists():
    df = pd.read_csv(results_csv)
    df.columns = df.columns.str.strip()
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    if 'train/box_loss' in df.columns:
        axes[0, 0].plot(df['epoch'], df['train/box_loss'], label='Box Loss')
        axes[0, 0].plot(df['epoch'], df['train/cls_loss'], label='Class Loss')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].set_title('Training Losses')
        axes[0, 0].legend()
        axes[0, 0].grid(True)
    
    if 'metrics/mAP50(B)' in df.columns:
        axes[0, 1].plot(df['epoch'], df['metrics/mAP50(B)'], label='mAP50')
        axes[0, 1].plot(df['epoch'], df['metrics/mAP50-95(B)'], label='mAP50-95')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('mAP')
        axes[0, 1].set_title('Validation mAP')
        axes[0, 1].legend()
        axes[0, 1].grid(True)
    
    if 'metrics/precision(B)' in df.columns:
        axes[1, 0].plot(df['epoch'], df['metrics/precision(B)'], label='Precision')
        axes[1, 0].plot(df['epoch'], df['metrics/recall(B)'], label='Recall')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Score')
        axes[1, 0].set_title('Precision & Recall')
        axes[1, 0].legend()
        axes[1, 0].grid(True)
    
    if 'val/box_loss' in df.columns:
        axes[1, 1].plot(df['epoch'], df['val/box_loss'], label='Val Box Loss')
        axes[1, 1].plot(df['epoch'], df['val/cls_loss'], label='Val Class Loss')
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('Loss')
        axes[1, 1].set_title('Validation Losses')
        axes[1, 1].legend()
        axes[1, 1].grid(True)
    
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "training_metrics.png", dpi=150)
    plt.show()
    print(f"Saved training metrics to: {MODEL_DIR / 'training_metrics.png'}")


"""
================================================================================
SECTION 12: EXPORT OPTIMIZED MODEL
================================================================================
"""
best_model = YOLO(str(best_model_path))

onnx_path = best_model.export(format="onnx", simplify=True, dynamic=False)
print(f"Exported ONNX model to: {onnx_path}")

torchscript_path = best_model.export(format="torchscript")
print(f"Exported TorchScript model to: {torchscript_path}")

model_info = {
    "model_name": "Urban Issues YOLOv8 Detector",
    "version": "1.0",
    "classes": CLASS_NAMES,
    "input_size": 640,
    "best_weights": str(best_model_path),
    "onnx_path": str(onnx_path),
    "torchscript_path": str(torchscript_path),
    "val_mAP50": float(val_results.box.map50),
    "val_mAP50_95": float(val_results.box.map)
}

with open(MODEL_DIR / "model_info.yaml", 'w') as f:
    yaml.dump(model_info, f, default_flow_style=False)

print(f"\nModel info saved to: {MODEL_DIR / 'model_info.yaml'}")
print("\n" + "="*60)
print("TRAINING PIPELINE COMPLETE!")
print("="*60)
print(f"Best model: {best_model_path}")
print(f"ONNX export: {onnx_path}")
print(f"Validation mAP50: {val_results.box.map50:.4f}")
"""
================================================================================
END OF PIPELINE
================================================================================
"""
