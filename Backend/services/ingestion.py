from uuid import UUID
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from Backend.core.events import event_bus, IssueCreated
from Backend.core.logging import get_logger
from Backend.core.schemas import IssueCreate, IssueState
from Backend.database.models import Issue, IssueImage
from Backend.services.geocoding import geocoding_service
from Backend.utils.storage import save_upload, get_upload_url, validate_file_extension, validate_file_size

logger = get_logger(__name__)


class IngestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_issue(
        self,
        data: IssueCreate,
        images: list[UploadFile],
        user_id: str | None = None
    ) -> tuple[Issue, list[str]]:
        if not images:
            raise ValueError("At least one image is required")
        
        for image in images:
            if not validate_file_extension(image.filename or ""):
                raise ValueError(f"Invalid file extension: {image.filename}")
        
        location_info = await geocoding_service.reverse_geocode(
            data.latitude, data.longitude
        )
        
        logger.info(f"Location resolved: {location_info.city}, {location_info.locality}")
        
        issue = Issue(
            user_id=user_id,
            description=data.description,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy_meters=data.accuracy_meters,
            platform=data.platform,
            device_model=data.device_model,
            state=IssueState.REPORTED,
            city=location_info.city,
            locality=location_info.locality,
            full_address=location_info.full_address,
        )

        self.db.add(issue)
        await self.db.flush()
        
        image_paths = []
        for image in images:
            file_path = await save_upload(image, subfolder=str(issue.id))
            
            issue_image = IssueImage(
                issue_id=issue.id,
                file_path=file_path,
                original_filename=image.filename,
            )
            self.db.add(issue_image)
            image_paths.append(file_path)
        
        await self.db.flush()
        
        event = IssueCreated(
            issue_id=issue.id,
            image_paths=image_paths,
            latitude=issue.latitude,
            longitude=issue.longitude,
            description=issue.description,
        )
        await event_bus.publish(event)
        
        logger.info(f"Issue created: {issue.id} in {issue.city}")
        
        return issue, image_paths
    
    async def get_issue(self, issue_id: UUID) -> Issue | None:
        return await self.db.get(Issue, issue_id)
