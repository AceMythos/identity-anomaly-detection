import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.covariance import EllipticEnvelope
from sklearn.preprocessing import StandardScaler

class AnomalyDetector:
    def __init__(self):
        self.scaler = StandardScaler()
        self.models = {
            "isolation_forest": None,
            "lof": None,
            "one_class_svm": None,
            "elliptic_envelope": None,
        }
        self.weights = {
            "isolation_forest": 0.35,
            "lof": 0.25,
            "one_class_svm": 0.20,
            "elliptic_envelope": 0.20,
        }
        self._fitted = False

    def _extract_features(self, events_df):
        rows = []
        for _, e in events_df.iterrows():
            ts = pd.to_datetime(e["timestamp"])
            hour = ts.hour
            is_weekend = ts.weekday() >= 5

            rows.append({
                "hour": hour,
                "is_weekend": int(is_weekend),
                "is_success": int(e.get("is_success", True)),
                "mfa_used": int(e.get("mfa_used", False)),
                "mfa_failed": int(e.get("mfa_failed", False)),
                "is_vpn": int(e.get("is_vpn", False)),
                "is_tor": int(e.get("is_tor", False)),
                "is_new_device": int(e.get("device", "") == "Unknown Browser" or e.get("browser", "") == "Spoofed"),
            })
        return pd.DataFrame(rows)

    def fit(self, events_df):
        X = self._extract_features(events_df)
        X_scaled = self.scaler.fit_transform(X)

        self.models["isolation_forest"] = IsolationForest(
            contamination=0.05, random_state=42, n_estimators=100
        ).fit(X_scaled)

        self.models["lof"] = LocalOutlierFactor(
            contamination=0.05, novelty=True
        ).fit(X_scaled)

        self.models["one_class_svm"] = OneClassSVM(
            nu=0.05, kernel="rbf", gamma="auto"
        ).fit(X_scaled)

        try:
            self.models["elliptic_envelope"] = EllipticEnvelope(
                contamination=0.05, random_state=42, support_fraction=0.7
            ).fit(X_scaled)
        except ValueError:
            self.models["elliptic_envelope"] = None

        self._fitted = True
        return self

    def predict(self, events_df):
        if not self._fitted:
            return [0.0] * len(events_df)

        X = self._extract_features(events_df)
        X_scaled = self.scaler.transform(X)

        scores = np.zeros((len(events_df), 4))

        if self.models["isolation_forest"]:
            scores[:, 0] = -self.models["isolation_forest"].decision_function(X_scaled)

        if self.models["lof"]:
            scores[:, 1] = -self.models["lof"].decision_function(X_scaled)

        if self.models["one_class_svm"]:
            scores[:, 2] = -self.models["one_class_svm"].decision_function(X_scaled)

        active = []
        active_weights = []
        for name, weight in self.weights.items():
            if self.models.get(name) is not None:
                active.append(name)
                active_weights.append(weight)

        for i, name in enumerate(active):
            col = scores[:, i]
            if col.max() > col.min():
                scores[:, i] = (col - col.min()) / (col.max() - col.min())

        if active_weights:
            w = np.array(active_weights)
            w = w / w.sum()
            final_scores = np.dot(scores[:, :len(active)], w)
        else:
            final_scores = np.zeros(len(events_df))

        final_scores = np.clip(final_scores * 100, 0, 100)
        return final_scores.tolist()

    def explain(self, events_df, index=0):
        if not self._fitted:
            return {}

        X = self._extract_features(events_df)
        X_scaled = self.scaler.transform(X)

        if index >= len(X_scaled):
            return {}

        row = X_scaled[index]
        feature_names = [
            "Hour", "Weekend", "Failed Auth", "MFA Skipped",
            "MFA Failed", "VPN", "TOR", "New Device"
        ]

        contributions = {}
        for name_idx, name in enumerate(["isolation_forest", "lof", "one_class_svm", "elliptic_envelope"]):
            model = self.models[name]
            if model is None:
                continue
            if hasattr(model, "decision_function"):
                base = model.decision_function(X_scaled[:1])
                scores = []
                for j in range(row.shape[0]):
                    perturbed = row.copy()
                    perturbed[j] = np.mean(X_scaled[:, j])
                    perturbed_score = model.decision_function(perturbed.reshape(1, -1))
                    scores.append(float(base[0] - perturbed_score[0]))
                contributions[name] = dict(zip(feature_names, scores))

        agg = {}
        for feat in feature_names:
            vals = [contributions[m].get(feat, 0) for m in contributions if m in contributions]
            agg[feat] = float(np.mean(vals)) if vals else 0

        total = sum(abs(v) for v in agg.values())
        if total > 0:
            for k in agg:
                agg[k] = round(abs(agg[k]) / total * 100, 1)

        return agg

DETECTOR = AnomalyDetector()
