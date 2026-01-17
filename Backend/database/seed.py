import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import sessionmaker
from Backend.database.models import Department, Member

logger = logging.getLogger(__name__)

async def seed_data(engine: AsyncEngine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        
        pwd_id = uuid.uuid4()
        sanitation_id = uuid.uuid4()
        traffic_id = uuid.uuid4()
        
        departments = [
            Department(
                id=pwd_id,
                name="Public Works Department",
                code="PWD",
                description="Roads, Potholes, Infrastructure",
                default_sla_hours=48,
                escalation_email="pwd_head@city.gov"
            ),
            Department(
                id=sanitation_id,
                name="Sanitation Department",
                code="SANITATION",
                description="Garbage, Cleaning, Waste",
                default_sla_hours=24,
                escalation_email="sanitation_head@city.gov"
            ),
            Department(
                id=traffic_id,
                name="Traffic Department",
                code="TRAFFIC",
                description="Signals, Signs, Illegal Parking",
                default_sla_hours=12,
                escalation_email="traffic_head@city.gov"
            )
        ]
        
        for dept in departments:
            session.add(dept)
        
        
        members = [
            Member(
                department_id=pwd_id,
                name="Ramesh Kumar",
                email="ramesh.pwd@city.gov",
                role="officer",
                city="New Delhi",
                locality="Connaught Place",
                max_workload=10
            ),
            Member(
                department_id=sanitation_id,
                name="Suresh Singh",
                email="suresh.sanitation@city.gov",
                role="officer",
                city="New Delhi",
                locality="Karol Bagh",
                max_workload=15
            ),
             Member(
                department_id=traffic_id,
                name="Priya Sharma",
                email="priya.traffic@city.gov",
                role="officer",
                city="New Delhi",
                locality="Lajpat Nagar",
                max_workload=12
            )
        ]
        
        for member in members:
            session.add(member)
            
        await session.commit()
        logger.info("Seeded 3 departments and 3 members.")
