from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    # Optional context to help the model (preferences, city, etc.)
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str


class Review(BaseModel):
    author: Optional[str] = None
    rating: Optional[float] = None
    text: str


class SummarizeReviewsRequest(BaseModel):
    placeName: str
    reviews: List[Review] = Field(default_factory=list)


class SummarizeReviewsResponse(BaseModel):
    what_people_say: List[str]
    pros: List[str]
    cons: List[str]
    best_for: List[str]


class PlaceCandidate(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    rating: Optional[float] = None
    userRatingCount: Optional[int] = None


class BuildItineraryRequest(BaseModel):
    start_lat: float
    start_lng: float
    candidates: List[PlaceCandidate]
    max_stops: int = 6
    # minutes spent at each stop (rough)
    dwell_minutes: int = 60
    # start time string for display only
    start_time: str = "09:00"


class ItineraryStop(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    eta_from_prev_min: int
    planned_start: str
    planned_end: str


class BuildItineraryResponse(BaseModel):
    ordered: List[ItineraryStop]