import aiohttp
from typing import Optional
from dataclasses import dataclass

from Backend.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class LocationInfo:
    city: Optional[str] = None
    locality: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    full_address: Optional[str] = None


class GeocodingService:
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
    
    async def reverse_geocode(self, latitude: float, longitude: float) -> LocationInfo:
        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "addressdetails": 1,
            "zoom": 18,
        }
        
        headers = {
            "User-Agent": "CityIssueResolutionAgent/1.0"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.NOMINATIM_URL,
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_response(data)
                    else:
                        logger.warning(f"Geocoding failed: {response.status}")
                        return LocationInfo()
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            return LocationInfo()
    
    def _parse_response(self, data: dict) -> LocationInfo:
        address = data.get("address", {})
        
        city = (
            address.get("city") or
            address.get("town") or
            address.get("municipality") or
            address.get("village") or
            address.get("suburb")
        )
        
        locality = (
            address.get("suburb") or
            address.get("neighbourhood") or
            address.get("quarter") or
            address.get("borough")
        )
        
        district = (
            address.get("county") or
            address.get("district") or
            address.get("state_district")
        )
        
        state = address.get("state")
        country = address.get("country")
        pincode = address.get("postcode")
        
        full_address = data.get("display_name")
        
        return LocationInfo(
            city=city,
            locality=locality,
            district=district,
            state=state,
            country=country,
            pincode=pincode,
            full_address=full_address,
        )
    
    async def get_city_from_coordinates(self, latitude: float, longitude: float) -> Optional[str]:
        location = await self.reverse_geocode(latitude, longitude)
        return location.city or location.locality or location.district


geocoding_service = GeocodingService()
