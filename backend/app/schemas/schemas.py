from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuthEvent(BaseModel):
    id: int
    timestamp: str
    user: str
    display_name: str
    ip: str
    country: str
    device: str
    os: str
    browser: str
    is_success: bool
    risk_score: float
    is_anomaly: bool

class Alert(BaseModel):
    id: int
    severity: str
    user: str
    display_name: str
    type: str
    description: str
    timestamp: str
    risk_score: float
    status: str
    mitre_id: str
    mitre_name: str

class KPI(BaseModel):
    total_events: int
    anomalies: int
    high_risk_users: int
    users_monitored: int
    total_events_change: float
    anomalies_change: float
    high_risk_change: float

class DashboardResponse(BaseModel):
    kpis: KPI
    anomaly_trend: list
    risk_distribution: list
    user_activity: list
    top_reasons: list
    recent_logins: list
    alerts: list
    scatter_data: list

class FeatureContribution(BaseModel):
    feature: str
    value: float
    color: str

class TimelineEvent(BaseModel):
    time: str
    event: str
    country: str
    icon: str
    severity: str

class InvestigationResponse(BaseModel):
    risk_score: float
    severity: str
    user: str
    display_name: str
    ip: str
    asn: str
    country: str
    previous_country: str
    device: str
    browser: str
    os: str
    distance_km: float
    mitre_id: str
    mitre_name: str
    ai_explanation: str
    confidence: float
    feature_contributions: list[FeatureContribution]
    timeline: list[TimelineEvent]
