from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from salmonwatch.db.engine import Base


class SpawningSite(Base):
    __tablename__ = "spawning_sites"

    id = Column(Integer, primary_key=True)
    nuseds_pop_id = Column(Integer, unique=True, index=True)
    stream_name = Column(Text)
    waterbody = Column(Text)
    species = Column(String(50), index=True)
    region = Column(String(100))
    watershed_code = Column(Text)
    conservation_unit = Column(Text)
    cu_status = Column(String(20))
    geom = Column(Geometry("POINT", srid=4326))
    lat = Column(Float)
    lon = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    observations = relationship("EscapementObservation", back_populates="site")

    __table_args__ = (
        Index("ix_spawning_sites_geom", "geom", postgresql_using="gist"),
    )


class EscapementObservation(Base):
    __tablename__ = "escapement_observations"

    id = Column(Integer, primary_key=True)
    site_id = Column(Integer, ForeignKey("spawning_sites.id"), nullable=False)
    year = Column(Integer, nullable=False)
    species = Column(String(50))
    natural_adult_spawners = Column(Integer)
    natural_jack_spawners = Column(Integer)
    total_spawners = Column(Integer)
    adult_broodstock_removals = Column(Integer)
    total_return_to_river = Column(Integer)
    accuracy = Column(String(50))
    run_type = Column(String(50))
    survey_method = Column(Text)

    site = relationship("SpawningSite", back_populates="observations")

    __table_args__ = (
        Index("ix_escapement_site_year", "site_id", "year"),
        Index("ix_escapement_species_year", "species", "year"),
    )


class PopulationAnalytics(Base):
    __tablename__ = "population_analytics"

    id = Column(Integer, primary_key=True)
    site_id = Column(
        Integer, ForeignKey("spawning_sites.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )
    data_years = Column(Integer)
    first_year = Column(Integer)
    last_year = Column(Integer)
    years_since_survey = Column(Integer)
    mean_spawners = Column(Float)
    median_spawners = Column(Float)
    peak_count = Column(Integer)
    peak_year = Column(Integer)
    latest_count = Column(Integer)
    trend_10yr = Column(Float)
    trend_20yr = Column(Float)
    decline_rate_per_decade = Column(Float)
    health_score = Column(Integer)
    health_status = Column(String(20))
    monitoring_gap_years = Column(Integer)
    data_completeness = Column(Float)
    is_monitored_recent = Column(Boolean)

    site = relationship("SpawningSite")

    __table_args__ = (
        Index("ix_pop_analytics_health_status", "health_status"),
        Index("ix_pop_analytics_health_score", "health_score"),
    )
