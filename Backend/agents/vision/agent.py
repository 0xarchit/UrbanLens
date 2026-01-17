import json
import time
import cv2
import numpy as np
import google.generativeai as genai
from pathlib import Path
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from Backend.core.config import settings
from Backend.core.events import event_bus, IssueClassified, IssueCreated
from Backend.core.logging import get_logger
from Backend.core.schemas import ClassificationResult, DetectionBox, CLASS_ID_TO_CATEGORY, IssueCategory
from Backend.database.models import Classification, Issue, IssueImage, IssueEvent
from Backend.orchestration.base import BaseAgent
from Backend.utils.fuzzy_match import auto_validate_issue
from Backend.utils.storage import save_bytes, download_from_supabase, get_upload_url

logger = get_logger(__name__, agent_name="VisionAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)


class VisionAgent(BaseAgent):
    _model = None
    
    def __init__(self, db: Optional[AsyncSession] = None):
        super().__init__("VisionAgent")
        self.db = db
        if settings.gemini_api_key:
            self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.gemini_model = None
    
    @classmethod
    def load_model(cls):
        if cls._model is None:
            from ultralytics import YOLO
            model_path = settings.model_path
            if not model_path.exists():
                raise FileNotFoundError(f"Model not found: {model_path}")
            cls._model = YOLO(str(model_path))
            logger.info(f"YOLO model loaded from {model_path}")
        return cls._model
    
    @classmethod
    def get_model(cls):
        if cls._model is None:
            cls.load_model()
        return cls._model
    
    async def download_image(self, remote_path: str) -> bytes:
        return await download_from_supabase(remote_path)
    
    async def save_annotated(self, results, original_path: str, subfolder: str) -> str:
        im_array = results[0].plot()
        
        original_name = Path(original_path).stem
        annotated_filename = f"annotated_{original_name}.jpg"
        
        _, buffer = cv2.imencode('.jpg', im_array, [cv2.IMWRITE_JPEG_QUALITY, 90])
        image_bytes = buffer.tobytes()
        
        remote_path = await save_bytes(image_bytes, annotated_filename, subfolder=subfolder)
        return remote_path
    
    async def run_inference(self, image_data: bytes) -> tuple[list, float]:
        model = self.get_model()
        
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image data")
        
        start_time = time.perf_counter()
        results = model.predict(
            source=img,
            conf=settings.model_confidence_threshold,
            imgsz=settings.model_input_size,
            verbose=False,
        )
        inference_time = (time.perf_counter() - start_time) * 1000
        
        return results, inference_time

    async def gemini_classify_image(
        self,
        image_data: bytes,
        description: Optional[str] = None
    ) -> tuple[Optional[IssueCategory], float, Optional[str]]:
        if not self.gemini_model:
            return None, 0.0, None

        allowed = [
            {"class_id": k, "class_name": v.value}
            for k, v in CLASS_ID_TO_CATEGORY.items()
        ]
        prompt = (
            "Classify the photo into exactly one of the allowed categories. "
            "Return ONLY valid JSON with keys: class_id (int), confidence (0.0-1.0), reasoning (max 80 chars).\n\n"
            f"Allowed categories: {json.dumps(allowed)}\n"
            f"User description: {(description or '')[:200]}"
        )

        try:
            response = self.gemini_model.generate_content(
                [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_data,
                        }
                    },
                ]
            )
            text = (response.text or "").replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            class_id = data.get("class_id")
            confidence = float(data.get("confidence", 0.0))
            reasoning = data.get("reasoning")
            if not isinstance(class_id, int):
                return None, 0.0, None
            category = CLASS_ID_TO_CATEGORY.get(class_id)
            if not category:
                return None, 0.0, None
            confidence = max(0.0, min(1.0, confidence))
            return category, confidence, reasoning
        except Exception as e:
            logger.error(f"Gemini vision classification failed: {e}")
            return None, 0.0, None
    
    def extract_detections(self, results) -> list[DetectionBox]:
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for i in range(len(boxes)):
                    class_id = int(boxes.cls[i].item())
                    confidence = float(boxes.conf[i].item())
                    bbox = tuple(boxes.xyxy[i].tolist())
                    
                    category = CLASS_ID_TO_CATEGORY.get(class_id)
                    if category:
                        detections.append(DetectionBox(
                            class_id=class_id,
                            class_name=category.value,
                            confidence=confidence,
                            bbox=bbox,
                        ))
        return detections
    
    async def classify_image(
        self,
        image_path: str,
        subfolder: str = "",
        description: Optional[str] = None
    ) -> tuple[list[DetectionBox], str, Optional[IssueCategory], float, Optional[str]]:
        image_data = await self.download_image(image_path)
        results, inference_time = await self.run_inference(image_data)
        annotated_path = await self.save_annotated(results, image_path, subfolder)
        detections = self.extract_detections(results)

        gemini_category = None
        gemini_confidence = 0.0
        gemini_reasoning = None
        if self.gemini_model and (not detections or max(d.confidence for d in detections) < 0.5):
            gemini_category, gemini_confidence, gemini_reasoning = await self.gemini_classify_image(
                image_data=image_data,
                description=description
            )
        
        logger.info(f"Inference completed in {inference_time:.2f}ms, {len(detections)} detections")
        return detections, annotated_path, gemini_category, gemini_confidence, gemini_reasoning
    
    async def process_issue(
        self,
        issue_id: UUID,
        image_paths: list[str],
        description: Optional[str] = None
    ) -> ClassificationResult:
        all_detections = []
        annotated_paths = []
        total_time = 0.0
        subfolder = str(issue_id)

        gemini_best_category = None
        gemini_best_confidence = 0.0
        gemini_best_reasoning = None
        
        for path in image_paths:
            start = time.perf_counter()
            detections, annotated_path, gemini_category, gemini_confidence, gemini_reasoning = await self.classify_image(
                path,
                subfolder=subfolder,
                description=description
            )
            total_time += (time.perf_counter() - start) * 1000
            all_detections.extend(detections)
            annotated_paths.append(annotated_path)

            if gemini_category and gemini_confidence > gemini_best_confidence:
                gemini_best_category = gemini_category
                gemini_best_confidence = gemini_confidence
                gemini_best_reasoning = gemini_reasoning
            
            if self.db:
                query = select(IssueImage).where(IssueImage.file_path == path)
                result = await self.db.execute(query)
                image_record = result.scalar_one_or_none()
                if image_record:
                    image_record.annotated_path = annotated_path
        
        result = ClassificationResult(
            issue_id=issue_id,
            detections=all_detections,
            annotated_urls=[get_upload_url(p) for p in annotated_paths],
            inference_time_ms=total_time,
        )

        if gemini_best_category and (not result.primary_category or result.primary_confidence < 0.5):
            result.primary_category = gemini_best_category
            result.primary_confidence = gemini_best_confidence
        
        detected_categories = list(set(d.class_name for d in all_detections))
        auto_validated, validation_reason = auto_validate_issue(description, detected_categories)
        
        validation_source = "auto" if auto_validated else "pending_manual"
        new_state = "validated" if auto_validated else "reported"
        
        self.log_decision(
            issue_id=issue_id,
            decision=f"Validation: {validation_source}",
            reasoning=validation_reason
        )
        
        if self.db:
            classification = Classification(
                issue_id=issue_id,
                primary_category=result.primary_category.value if result.primary_category else None,
                primary_confidence=result.primary_confidence,
                detections_json=json.dumps([d.model_dump() for d in all_detections]),
                inference_time_ms=total_time,
            )
            self.db.add(classification)
            
            issue = await self.db.get(Issue, issue_id)
            if issue:
                issue.state = new_state
                issue.validation_source = validation_source
                issue.validation_reason = validation_reason
            
            event_record = IssueEvent(
                issue_id=issue_id,
                event_type="classified",
                agent_name=self.name,
                event_data=json.dumps({
                    "category": result.primary_category.value if result.primary_category else None,
                    "confidence": result.primary_confidence,
                    "detections_count": len(all_detections),
                    "validation_source": validation_source,
                    "annotated_images": annotated_paths,
                    "gemini_category": gemini_best_category.value if gemini_best_category else None,
                    "gemini_confidence": gemini_best_confidence,
                    "gemini_reasoning": gemini_best_reasoning,
                })
            )
            self.db.add(event_record)
            await self.db.flush()
        
        if result.primary_category:
            event = IssueClassified(
                issue_id=issue_id,
                category=result.primary_category.value,
                confidence=result.primary_confidence,
                detections_count=len(all_detections),
                metadata={
                    "validation_source": validation_source,
                    "validation_reason": validation_reason,
                    "annotated_images": [get_upload_url(p) for p in annotated_paths],
                }
            )
            await event_bus.publish(event)
        
        return result
    
    async def handle(self, event: IssueCreated) -> None:
        await self.process_issue(
            event.issue_id,
            event.image_paths,
            event.description
        )
