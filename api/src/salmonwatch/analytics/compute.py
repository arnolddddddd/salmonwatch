"""Analytics computation module for per-population metrics.

Computes health scores, trends, monitoring gaps, and other derived
metrics from raw escapement observations.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from typing import Optional

from sqlalchemy import delete, text
from sqlalchemy.orm import Session

from salmonwatch.db.tables import (
    EscapementObservation,
    PopulationAnalytics,
    SpawningSite,
)


def _compute_trend(yearly_counts: dict[int, int], window: int) -> Optional[float]:
    """Compute % change between recent window and prior window of same size.

    Compares the mean of the most recent `window` years that have data
    against the mean of the preceding `window` years that have data.

    Returns None if there are fewer than `window * 2` data points.
    """
    if len(yearly_counts) < window * 2:
        return None

    sorted_years = sorted(yearly_counts.keys())
    recent_years = sorted_years[-window:]
    prior_years = sorted_years[-window * 2 : -window]

    recent_mean = statistics.mean(yearly_counts[y] for y in recent_years)
    prior_mean = statistics.mean(yearly_counts[y] for y in prior_years)

    if prior_mean == 0:
        return None

    return ((recent_mean - prior_mean) / prior_mean) * 100.0


def _compute_max_gap(years: list[int]) -> int:
    """Find longest consecutive gap between observation years.

    Returns 0 if fewer than 2 years of data.
    """
    if len(years) < 2:
        return 0

    sorted_years = sorted(years)
    max_gap = 0
    for i in range(1, len(sorted_years)):
        gap = sorted_years[i] - sorted_years[i - 1] - 1
        if gap > max_gap:
            max_gap = gap
    return max_gap


def _compute_health_score(
    trend_10yr: Optional[float],
    latest_count: Optional[int],
    peak_count: Optional[int],
    years_since_survey: int,
    data_completeness: float,
) -> int:
    """Composite 0-100 health score.

    Weighting:
      - 40% trend component (maps [-100, +100] to [0, 40]; neutral 20 if unknown)
      - 25% abundance ratio (latest/peak; neutral 12.5 if unknown)
      - 20% monitoring recency
      - 15% data completeness
    """
    # --- Trend component (40 points) ---
    if trend_10yr is not None:
        clamped = max(-100.0, min(100.0, trend_10yr))
        trend_score = ((clamped + 100.0) / 200.0) * 40.0
    else:
        trend_score = 20.0  # neutral

    # --- Abundance ratio component (25 points) ---
    if latest_count is not None and peak_count is not None and peak_count > 0:
        ratio = min(1.0, latest_count / peak_count)
        abundance_score = ratio * 25.0
    else:
        abundance_score = 12.5  # neutral

    # --- Monitoring recency component (20 points) ---
    if years_since_survey <= 2:
        recency_score = 20.0
    elif years_since_survey <= 5:
        recency_score = 15.0
    elif years_since_survey <= 10:
        recency_score = 8.0
    else:
        recency_score = 0.0

    # --- Data completeness component (15 points) ---
    completeness_score = min(1.0, data_completeness) * 15.0

    total = trend_score + abundance_score + recency_score + completeness_score
    return int(round(total))


def _health_status(score: int) -> str:
    """Map numeric score to status bucket.

    0-20: critical, 21-40: poor, 41-60: fair, 61-80: good, 81-100: strong
    """
    if score <= 20:
        return "critical"
    elif score <= 40:
        return "poor"
    elif score <= 60:
        return "fair"
    elif score <= 80:
        return "good"
    else:
        return "strong"


def compute_all_population_analytics(
    db: Session,
    current_year: Optional[int] = None,
) -> int:
    """Compute analytics for every SpawningSite and persist results.

    For each site:
      1. Query all EscapementObservation rows.
      2. Aggregate by year (sum multiple run types per year).
      3. Compute all derived metrics.
      4. Clear existing population_analytics rows.
      5. Insert new PopulationAnalytics rows.

    Returns the number of rows inserted.
    """
    if current_year is None:
        from datetime import date

        current_year = date.today().year

    # Fetch all sites
    sites = db.query(SpawningSite).all()

    # Fetch all observations in one query, grouped by site
    all_obs = db.query(EscapementObservation).order_by(
        EscapementObservation.site_id,
        EscapementObservation.year,
    ).all()

    obs_by_site: dict[int, list[EscapementObservation]] = defaultdict(list)
    for obs in all_obs:
        obs_by_site[obs.site_id].append(obs)

    # Clear existing analytics
    db.execute(delete(PopulationAnalytics))

    analytics_rows = []

    for site in sites:
        observations = obs_by_site.get(site.id, [])

        if not observations:
            # No data -- insert a row with minimal info
            analytics_rows.append(PopulationAnalytics(
                site_id=site.id,
                data_years=0,
                first_year=None,
                last_year=None,
                years_since_survey=None,
                mean_spawners=None,
                median_spawners=None,
                peak_count=None,
                peak_year=None,
                latest_count=None,
                trend_10yr=None,
                trend_20yr=None,
                decline_rate_per_decade=None,
                health_score=0,
                health_status="critical",
                monitoring_gap_years=0,
                data_completeness=0.0,
                is_monitored_recent=False,
            ))
            continue

        # Aggregate by year: sum total_spawners across run types
        yearly_counts: dict[int, int] = defaultdict(int)
        for obs in observations:
            count = obs.total_spawners or 0
            yearly_counts[obs.year] += count

        sorted_years = sorted(yearly_counts.keys())
        counts = [yearly_counts[y] for y in sorted_years]

        data_years = len(sorted_years)
        first_year = sorted_years[0]
        last_year = sorted_years[-1]
        years_since_survey = current_year - last_year

        mean_spawners = statistics.mean(counts)
        median_spawners = statistics.median(counts)

        peak_count = max(counts)
        peak_year = sorted_years[counts.index(peak_count)]

        latest_count = yearly_counts[last_year]

        # Trends
        trend_10yr = _compute_trend(yearly_counts, window=5)
        trend_20yr = _compute_trend(yearly_counts, window=10)

        # Decline rate per decade (simple linear approach using 10yr trend)
        decline_rate = None
        if trend_10yr is not None:
            decline_rate = round(trend_10yr, 2)

        # Monitoring gap
        monitoring_gap = _compute_max_gap(sorted_years)

        # Data completeness: fraction of years with data out of the span
        span = last_year - first_year + 1
        data_completeness = data_years / span if span > 0 else 0.0

        # Recent monitoring flag
        is_monitored_recent = years_since_survey <= 5

        # Health score
        health_score = _compute_health_score(
            trend_10yr=trend_10yr,
            latest_count=latest_count,
            peak_count=peak_count,
            years_since_survey=years_since_survey,
            data_completeness=data_completeness,
        )
        health_status = _health_status(health_score)

        analytics_rows.append(PopulationAnalytics(
            site_id=site.id,
            data_years=data_years,
            first_year=first_year,
            last_year=last_year,
            years_since_survey=years_since_survey,
            mean_spawners=round(mean_spawners, 2),
            median_spawners=round(median_spawners, 2),
            peak_count=peak_count,
            peak_year=peak_year,
            latest_count=latest_count,
            trend_10yr=round(trend_10yr, 2) if trend_10yr is not None else None,
            trend_20yr=round(trend_20yr, 2) if trend_20yr is not None else None,
            decline_rate_per_decade=decline_rate,
            health_score=health_score,
            health_status=health_status,
            monitoring_gap_years=monitoring_gap,
            data_completeness=round(data_completeness, 4),
            is_monitored_recent=is_monitored_recent,
        ))

    db.add_all(analytics_rows)
    db.commit()

    return len(analytics_rows)
