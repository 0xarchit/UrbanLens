from math import radians, cos, sin, asin, sqrt
from typing import Sequence
from uuid import UUID


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    
    return R * c


def is_within_radius(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    radius_meters: float
) -> bool:
    return haversine_distance(lat1, lon1, lat2, lon2) <= radius_meters


def find_nearby_issues(
    target_lat: float,
    target_lon: float,
    issues: Sequence[tuple[UUID, float, float]],
    radius_meters: float
) -> list[tuple[UUID, float]]:
    nearby = []
    for issue_id, lat, lon in issues:
        distance = haversine_distance(target_lat, target_lon, lat, lon)
        if distance <= radius_meters:
            nearby.append((issue_id, distance))
    return sorted(nearby, key=lambda x: x[1])


def get_bounding_box(lat: float, lon: float, radius_meters: float) -> tuple[float, float, float, float]:
    R = 6371000
    lat_delta = (radius_meters / R) * (180 / 3.14159265359)
    lon_delta = lat_delta / cos(radians(lat))
    
    return (
        lat - lat_delta,
        lat + lat_delta,
        lon - lon_delta,
        lon + lon_delta
    )
