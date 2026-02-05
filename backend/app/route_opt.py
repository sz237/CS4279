import math
from typing import List, Tuple


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    R = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    x = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def nearest_neighbor_route(
    start: Tuple[float, float],
    points: List[Tuple[float, float]],
) -> List[int]:
    """
    Returns indices of points in visit order.
    """
    remaining = set(range(len(points)))
    route: List[int] = []
    curr = start
    while remaining:
        nxt = min(remaining, key=lambda i: haversine_km(curr, points[i]))
        route.append(nxt)
        remaining.remove(nxt)
        curr = points[nxt]
    return route


def two_opt(route: List[int], points: List[Tuple[float, float]], start: Tuple[float, float]) -> List[int]:
    """
    Basic 2-opt improvement. Keeps start fixed (not included in route indices).
    """
    def dist_for_route(r: List[int]) -> float:
        d = 0.0
        curr = start
        for idx in r:
            d += haversine_km(curr, points[idx])
            curr = points[idx]
        return d

    best = route[:]
    best_dist = dist_for_route(best)
    improved = True
    while improved:
        improved = False
        for i in range(len(best) - 1):
            for k in range(i + 1, len(best)):
                new = best[:i] + list(reversed(best[i:k + 1])) + best[k + 1:]
                new_dist = dist_for_route(new)
                if new_dist + 1e-9 < best_dist:
                    best = new
                    best_dist = new_dist
                    improved = True
                    break
            if improved:
                break
    return best


def minutes_from_km(km: float, speed_kmh: float = 30.0) -> int:
    # crude city driving estimate
    return max(3, int(round((km / speed_kmh) * 60)))