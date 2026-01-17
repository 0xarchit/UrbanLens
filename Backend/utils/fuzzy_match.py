from difflib import SequenceMatcher
from typing import Optional

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Damaged Road Issues": [
        "road", "damage", "damaged", "broken", "crack", "cracked", "pavement",
        "asphalt", "street", "highway", "lane", "surface", "rough", "uneven"
    ],
    "Pothole Issues": [
        "pothole", "hole", "pit", "crater", "dip", "depression", "bump",
        "cavity", "hollow", "gap"
    ],
    "Illegal Parking Issues": [
        "parking", "parked", "car", "vehicle", "illegal", "wrong", "blocking",
        "obstruction", "no parking", "double park", "sidewalk"
    ],
    "Broken Road Sign Issues": [
        "sign", "signboard", "traffic sign", "road sign", "broken sign",
        "fallen sign", "damaged sign", "missing sign", "bent"
    ],
    "Fallen Trees": [
        "tree", "fallen", "branch", "trunk", "uprooted", "collapsed",
        "blocking", "storm", "wind", "timber"
    ],
    "Littering/Garbage on Public Places": [
        "garbage", "trash", "litter", "waste", "rubbish", "dump", "dirty",
        "filth", "debris", "plastic", "pile", "mess", "junk", "disposal"
    ],
    "Vandalism Issues": [
        "vandal", "graffiti", "spray", "paint", "defaced", "broken",
        "smashed", "destroyed", "damaged property", "torn"
    ],
    "Dead Animal Pollution": [
        "dead", "animal", "carcass", "body", "corpse", "rotting", "smell",
        "stink", "dog", "cat", "bird", "cow", "roadkill"
    ],
    "Damaged Concrete Structures": [
        "concrete", "structure", "wall", "pillar", "bridge", "flyover",
        "footpath", "sidewalk", "curb", "crack", "broken"
    ],
    "Damaged Electric Wires and Poles": [
        "electric", "wire", "pole", "cable", "power", "electricity",
        "hanging", "exposed", "sparking", "transformer", "light pole"
    ],
}


def normalize_text(text: str) -> str:
    return text.lower().strip()


def calculate_similarity(s1: str, s2: str) -> float:
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()


def fuzzy_match_word(word: str, keywords: list[str], threshold: float = 0.7) -> bool:
    word = normalize_text(word)
    for keyword in keywords:
        if word == keyword:
            return True
        if len(word) >= 4 and calculate_similarity(word, keyword) >= threshold:
            return True
        if keyword in word or word in keyword:
            return True
    return False


def match_description_to_category(
    description: Optional[str],
    detected_category: str,
    threshold: float = 0.6
) -> tuple[bool, float, list[str]]:
    if not description:
        return False, 0.0, []
    
    keywords = CATEGORY_KEYWORDS.get(detected_category, [])
    if not keywords:
        return False, 0.0, []
    
    words = normalize_text(description).replace(",", " ").replace(".", " ").split()
    
    matched_words = []
    for word in words:
        if len(word) < 3:
            continue
        if fuzzy_match_word(word, keywords):
            matched_words.append(word)
    
    if not words:
        return False, 0.0, []
    
    match_score = len(matched_words) / max(len(words), 1)
    is_match = len(matched_words) >= 1 or match_score >= threshold
    
    return is_match, match_score, matched_words


def auto_validate_issue(
    description: Optional[str],
    detected_categories: list[str],
    confidence_threshold: float = 0.5
) -> tuple[bool, str]:
    if not description or not detected_categories:
        return False, "No description or no detections for auto-validation"
    
    for category in detected_categories:
        is_match, score, matched_words = match_description_to_category(
            description, category
        )
        if is_match:
            return True, f"Auto-validated: '{category}' matched with keywords: {matched_words}"
    
    return False, f"Manual verification required: no match between description and detected categories {detected_categories}"
