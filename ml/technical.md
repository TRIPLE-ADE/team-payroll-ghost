# GhostGuard

## AI-Powered Nigerian Payroll Ghost Worker Detection System

> Built for Squad Hackathon
> Stack: Python · Flask · XGBoost · Isolation Forest · DBSCAN · Splink

---

# Overview

GhostGuard is an AI-powered payroll fraud detection system designed to identify ghost workers, duplicate employee identities, payroll manipulation, and anomalous salary behaviors in Nigerian government payroll systems.

The platform combines:

* Rule-based fraud detection
* Unsupervised anomaly detection
* Supervised machine learning
* Behavioral clustering
* Privacy-preserving identity anonymization

The goal is to detect:

* Duplicate payroll identities
* Shared bank accounts across employees
* Phantom employees
* Attendance anomalies
* Inflated salaries
* Coordinated fraud rings

---

# System Architecture

```text
Raw Payroll Data
        │
        ▼
Anonymization Layer
(SHA-256 hashing of sensitive data)
        │
        ▼
Feature Engineering Pipeline
        │
        ├──────────────► Duplicate Detection Engine
        │
        ▼
3-Layer AI Detection Pipeline
        │
        ├── Layer 1: Heuristic Rules
        ├── Layer 2: Isolation Forest
        └── Layer 3: XGBoost Classifier
        │
        ▼
Composite Risk Score
        │
        ▼
Fraud Classification & Audit Logging
```

---

# Core Technical Approach

## 1. Privacy-Preserving Data Processing

GhostGuard never trains directly on raw personally identifiable information (PII).

Sensitive fields such as:

* BVN
* NIN
* Account Number
* Phone Number
* Employee Names

are anonymized using salted SHA-256 hashing before entering the ML pipeline.

```python
import hashlib

def anon(value, salt):
    return hashlib.sha256(f"{salt}{value}".encode()).hexdigest()[:20]
```

## Why We Use Hashing

* Prevents exposure of sensitive government payroll data
* Preserves relationships between records
* Enables duplicate detection without revealing identities
* Aligns with NDPR(Nigeria Data Protection Right) privacy principles
* Eliminates dependency on reversible encryption

This allows the system to detect:

* Shared BVNs
* Shared NINs
* Shared bank accounts

without exposing the actual values.

---

# Synthetic Data Generation

Since real IPPIS/GIFMIS payroll data is restricted, GhostGuard generates a realistic synthetic Nigerian payroll dataset.

## Dataset Characteristics

* 50,000 payroll records
* 90% legitimate employees
* 10% injected ghost workers
* Nigerian salary structures
* Realistic federal ministry distributions
* NUBAN-compliant account numbers
* BVN/NIN format validation

## Fraud Injection Logic

The dataset intentionally injects multiple fraud patterns:

| Fraud Type       | Behavioral Signature                          |
| ---------------- | --------------------------------------------- |
| Shared Account   | Multiple employees linked to one bank account |
| Duplicate Record | Same BVN across different records             |
| Phantom Worker   | Zero attendance and no deductions             |
| Inflated Salary  | Salary exceeds official grade ceiling         |
| No-show Worker   | Persistently low attendance                   |

## Why Synthetic Data

* No dependency on government data access
* Enables rapid experimentation
* Allows supervised ML bootstrapping
* Simulates real fraud behaviors safely
* Makes the system demo-ready for hackathons and pilots

---

# Feature Engineering

GhostGuard transforms payroll records into behavioral features.

## Core Features

| Feature               | Purpose                                 |
| --------------------- | --------------------------------------- |
| Salary                | Detect inflated payrolls                |
| Grade Level           | Compare against salary ceilings         |
| Attendance Rate       | Identify no-show workers                |
| Deduction History     | Detect inactive payroll behavior        |
| Promotion Count       | Identify unrealistic career progression |
| Shared Identity Flags | Detect duplicate identities             |
| Tenure                | Provide historical employment context   |

## Why Behavioral Features

Behavioral fraud patterns generalize better than identity-based rules.

This allows the system to detect:

* Previously unseen fraud strategies
* Coordinated fraud rings
* Suspicious employee behavior
* Payroll anomalies without requiring exact identity matches

---

# 3-Layer AI Detection Pipeline

GhostGuard combines deterministic rules, anomaly detection, and supervised learning.

---

## Layer 1 — Heuristic Rules Engine

The first layer applies deterministic fraud rules.

### Examples

* Shared bank account
* Shared BVN/NIN
* Salary above grade ceiling
* Zero attendance
* No payroll deductions
* No leave history

## Why We Use Heuristics

* Extremely fast
* Fully explainable
* High precision
* Captures obvious fraud instantly
* Works even without training data

This layer acts as the first security filter.

---

## Layer 2 — Isolation Forest

The second layer uses Isolation Forest for unsupervised anomaly detection.

```python
IsolationForest(
    n_estimators=300,
    contamination=0.10,
    random_state=42,
    n_jobs=-1
)
```

## Why Isolation Forest

* Does not require labeled fraud data
* Detects statistical outliers automatically
* Works well with heavily imbalanced fraud datasets
* Scales efficiently to large payroll systems
* Detects hidden anomalies missed by rules

Isolation Forest isolates unusual employee behaviors by recursively partitioning the feature space.

Employees with highly unusual patterns are isolated faster and assigned higher anomaly scores.

---

## Layer 3 — XGBoost Classifier

The final layer uses supervised learning with XGBoost.

```python
XGBClassifier(
    n_estimators=400,
    max_depth=5,
    learning_rate=0.03,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=9
)
```

## Why XGBoost

* Excellent performance on structured/tabular data
* Handles class imbalance effectively
* Supports feature importance analysis
* Fast training and inference
* Strong fraud detection accuracy
* Interpretable predictions

## Training Strategy

GhostGuard uses weak supervision initially.

### Cold Start Training

At the beginning, heuristic detections are used as pseudo-labels:

```text
heuristic_score >= threshold → ghost worker
```

This bootstraps the first training cycle even without confirmed fraud investigations.

### Active Learning Loop

As investigators review flagged records:

* Confirmed fraud cases become real labels
* Cleared employees become negative labels
* New investigator decisions are stored in the audit database
* The model retrains periodically using real-world feedback

This allows the system to continuously improve over time.

---

# Composite Risk Scoring

Each layer contributes to a final fraud score.

```python
final_score = (
    heuristic_score * 0.35 +
    anomaly_score   * 0.25 +
    ml_score        * 0.40
)
```

## Why Weighted Scoring

Different detection techniques have different strengths.

| Layer            | Purpose                             |
| ---------------- | ----------------------------------- |
| Heuristics       | High-confidence deterministic fraud |
| Isolation Forest | Unknown anomalies                   |
| XGBoost          | Complex learned fraud patterns      |

Combining all three produces:

* Better recall
* Lower false positives
* Stronger fraud confidence
* More robust detection coverage

---

# Duplicate Detection Engine

GhostGuard includes a multi-strategy duplicate identity detection engine.

---

## Strategy 1 — Exact Identity Matching

Detects:

* Shared BVNs
* Shared NINs
* Shared bank accounts

### Why

These are high-confidence fraud indicators and easy to validate.

---

## Strategy 2 — Fuzzy Name Matching

Uses fuzzy string similarity to detect slightly modified employee identities.

Examples:

* Ibrahim Musa → Ibrahim Mussa
* Taiwo Adeleke → T. Adeleke

### Why

Fraudsters often alter names slightly while reusing other identity components.

Fuzzy matching helps identify these disguised duplicates.

---

## Strategy 3 — DBSCAN Behavioral Clustering

GhostGuard applies DBSCAN to group employees with nearly identical behavioral patterns.

```python
DBSCAN(
    eps=0.4,
    min_samples=2
)
```

## Why DBSCAN

* Does not require predefined cluster counts
* Detects fraud rings automatically
* Handles irregular cluster shapes
* Identifies dense suspicious behavioral groups

This is useful for detecting coordinated ghost worker networks.

---

## Strategy 4 — Per-MDA Anomaly Detection

Isolation Forest models are trained independently within each ministry.

## Why

An employee may appear normal globally but anomalous within their own ministry.

This catches:

* Local salary inflation
* Department-specific payroll abuse
* Ministry-level fraud patterns

---

# Audit & Continuous Learning

Every investigator action is stored in an audit database.

## Why Audit Logging Matters

* Creates accountability
* Preserves investigation history
* Enables model retraining
* Supports continuous improvement
* Builds explainable fraud workflows

The audit system powers GhostGuard's active learning architecture.

---

# Design Decisions

## Why Not Deep Learning?

Tree-based models outperform deep learning on structured payroll data because:

* Smaller datasets require less data-hungry models
* Faster training and inference
* Easier explainability
* Better fraud interpretability
* Lower infrastructure requirements

XGBoost provided the best balance between:

* Accuracy
* Speed
* Explainability
* Production readiness

---

## Why Isolation Forest Instead of One-Class SVM?

Isolation Forest was selected because:

* Better scalability
* Faster training time
* Lower computational cost
* Strong anomaly detection performance
* More suitable for large payroll datasets

---

## Why DBSCAN Instead of K-Means?

DBSCAN was selected because:

* Fraud cluster counts are unknown
* Fraud patterns are irregular
* Automatically identifies outliers
* More robust for anomaly grouping

K-Means requires predefined cluster counts, making it less suitable for fraud detection.

---

# Technology Stack

| Component          | Technology         |
| ------------------ | ------------------ |
| Backend API        | Flask              |
| ML Framework       | XGBoost            |
| Anomaly Detection  | Isolation Forest   |
| Clustering         | DBSCAN             |
| Data Processing    | Pandas + NumPy     |
| Duplicate Matching | RapidFuzz + Splink |
| Documentation      | Flasgger           |
| Storage            | SQLite             |

---

# Project Structure

```text
ghostguard/
│
├── app.py
├── src/
│   ├── generate_data.py
│   ├── build_clean_data.py
│   ├── train_models.py
│   ├── duplicate_detector.py
│   └── generate_sample_csv.py
│
├── models/
│   ├── isolation_forest.pkl
│   ├── xgboost_ghost.pkl
│   ├── metadata.json
│   └── feature_configs.pkl
│
└── data/
    ├── payroll_for_training.csv
    ├── payroll_scored.csv
    ├── duplicate_pairs.csv
    ├── mda_anomalies.csv
    └── audit.db
```

---

# Training Workflow

```text
1. Generate synthetic payroll data
        │
2. Anonymize sensitive fields
        │
3. Engineer behavioral features
        │
4. Train Isolation Forest
        │
5. Generate anomaly scores
        │
6. Train XGBoost using:
   - engineered features
   - heuristic outputs
   - anomaly scores
        │
7. Save trained models
        │
8. Run duplicate detection engine
        │
9. Deploy scoring API
```

---

# Key Advantages

* Privacy-preserving architecture
* Explainable fraud detection
* Multi-layer AI pipeline
* Handles unlabeled fraud scenarios
* Active learning feedback loop
* Nigerian payroll compliance awareness
* Detects both individual and coordinated fraud
* Scalable to national payroll systems

---

# Conclusion

GhostGuard demonstrates how AI, anomaly detection, and behavioral analytics can be combined to combat payroll fraud in large-scale government systems.

By combining:

* deterministic rules,
* unsupervised anomaly detection,
* supervised learning,
* clustering,
* and privacy-preserving identity analysis,

GhostGuard provides a scalable framework for identifying ghost workers, duplicate payroll identities, and suspicious payroll behavior while maintaining strong privacy guarantees.

---

*Built for the Squad Hackathon — GhostGuard Team*
