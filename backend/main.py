from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

from app.schemas import (
    ChatRequest, ChatResponse,
    SummarizeReviewsRequest, SummarizeReviewsResponse,
    BuildItineraryRequest, BuildItineraryResponse, ItineraryStop,
)
from app.ollama_client import ollama_chat
from app.route_opt import (
    nearest_neighbor_route, two_opt,
    haversine_km, minutes_from_km
)

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

app = FastAPI(title="Nomad AI Backend", version="0.1.0")

# Allow Expo dev servers + iOS simulator/web to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for class project; lock down later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "model": OLLAMA_MODEL, "ollama": OLLAMA_BASE_URL}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Optional: insert a system instruction so the assistant returns concise, helpful travel answers
    system_prefix = {
        "role": "system",
        "content": (
            "You are Nomad, a travel planning assistant. "
            "Be concise, practical, and ask 1 clarifying question only if absolutely necessary. "
            "When giving recommendations, prefer bullet points."
        ),
    }

    messages = [system_prefix] + [m.model_dump() for m in req.messages]

    # Add lightweight context if provided
    if req.context:
        messages.insert(
            1,
            {
                "role": "system",
                "content": f"Context (JSON): {req.context}",
            },
        )

    reply = await ollama_chat(
        base_url=OLLAMA_BASE_URL,
        model=OLLAMA_MODEL,
        messages=messages,
        timeout_s=90.0,
    )
    return ChatResponse(reply=reply.strip())


@app.post("/summarize-reviews", response_model=SummarizeReviewsResponse)
async def summarize_reviews(req: SummarizeReviewsRequest):
    # Build a compact input for the model
    review_lines = []
    for r in req.reviews[:20]:
        rating = f"{r.rating}/5" if r.rating is not None else "N/A"
        author = r.author or "Anonymous"
        text = (r.text or "").strip().replace("\n", " ")
        if text:
            review_lines.append(f"- ({rating}) {author}: {text}")

    prompt = (
        f"Place: {req.placeName}\n"
        "You will summarize the customer reviews below.\n\n"
        "Return STRICT JSON with keys:\n"
        'what_people_say (array of 3 short bullets), pros (array), cons (array), best_for (array)\n\n'
        "Reviews:\n" + "\n".join(review_lines)
    )

    reply = await ollama_chat(
        base_url=OLLAMA_BASE_URL,
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": "You are a precise JSON generator. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        timeout_s=90.0,
    )

    # Very simple parse: try JSON; if it fails, fall back to safe defaults
    import json
    try:
        data = json.loads(reply)
        return SummarizeReviewsResponse(
            what_people_say=data.get("what_people_say", [])[:3],
            pros=data.get("pros", [])[:6],
            cons=data.get("cons", [])[:6],
            best_for=data.get("best_for", [])[:6],
        )
    except Exception:
        return SummarizeReviewsResponse(
            what_people_say=["Mixed feedback (parsing failed)."],
            pros=[],
            cons=[],
            best_for=[],
        )


@app.post("/build-itinerary", response_model=BuildItineraryResponse)
async def build_itinerary(req: BuildItineraryRequest):
    start = (req.start_lat, req.start_lng)
    candidates = req.candidates[: req.max_stops]
    points = [(c.lat, c.lng) for c in candidates]

    # Route order: NN + 2-opt
    initial = nearest_neighbor_route(start, points)
    improved = two_opt(initial, points, start)

    # Build a simple schedule
    t = datetime.strptime(req.start_time, "%H:%M")
    ordered_stops = []
    prev = start

    for idx in improved:
        c = candidates[idx]
        km = haversine_km(prev, (c.lat, c.lng))
        travel_min = minutes_from_km(km)
        t = t + timedelta(minutes=travel_min)
        planned_start = t.strftime("%H:%M")
        t = t + timedelta(minutes=req.dwell_minutes)
        planned_end = t.strftime("%H:%M")

        ordered_stops.append(
            ItineraryStop(
                id=c.id,
                name=c.name,
                lat=c.lat,
                lng=c.lng,
                eta_from_prev_min=travel_min,
                planned_start=planned_start,
                planned_end=planned_end,
            )
        )
        prev = (c.lat, c.lng)

    return BuildItineraryResponse(ordered=ordered_stops)