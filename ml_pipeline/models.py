"""
Model Definitions and Dual-Branch Late-Fusion Architecture.

Implements:
1. Base learners: Logistic Regression, Decision Tree, Random Forest, SVM
2. Calibration: Platt scaling
3. Dual-Branch Late Fusion with Per-Record Reliability Weighting (Section 3.6)
4. Out-of-fold probability generator for leak-free meta-learning
"""

import numpy as np
from typing import Dict, Any, Tuple, Optional
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.base import BaseEstimator, ClassifierMixin

def get_base_model(model_name: str, random_state: int = 42) -> BaseEstimator:
    """
    Factory function returning the specified machine learning algorithm.
    """
    model_name = model_name.lower()
    if model_name in ['logistic_regression', 'lr']:
        return Pipeline([
            ('scaler', StandardScaler()),
            ('clf', LogisticRegression(C=0.1, max_iter=1000, random_state=random_state))
        ])
    elif model_name in ['decision_tree', 'dt']:
        return DecisionTreeClassifier(max_depth=6, min_samples_leaf=20, random_state=random_state)
    elif model_name in ['random_forest', 'rf']:
        return RandomForestClassifier(n_estimators=100, max_depth=10, min_samples_leaf=10, n_jobs=-1, random_state=random_state)
    elif model_name in ['svm', 'support_vector_machine']:
        # Using linear SVM with Platt probability calibration for efficiency and scaling
        from sklearn.linear_model import SGDClassifier
        return Pipeline([
            ('scaler', StandardScaler()),
            ('clf', CalibratedClassifierCV(SGDClassifier(loss='hinge', penalty='l2', alpha=1e-3, random_state=random_state), cv=3))
        ])
    else:
        raise ValueError(f"Unknown model name: {model_name}")

class DualBranchLateFusion(BaseEstimator, ClassifierMixin):
    """
    Dual-Branch Late-Fusion Architecture with Per-Record Reliability Weighting.
    Specified in Section 3.6 of Sarjan's ARP report.
    """
    def __init__(
        self,
        clinical_model_name: str = 'rf',
        lifestyle_model_name: str = 'rf',
        include_reliability: bool = True,
        random_state: int = 42
    ):
        self.clinical_model_name = clinical_model_name
        self.lifestyle_model_name = lifestyle_model_name
        self.include_reliability = include_reliability
        self.random_state = random_state
        
        self.clinical_branch = None
        self.lifestyle_branch = None
        self.meta_learner = None
        self.meta_scaler = StandardScaler()
        
    def _create_meta_features(self, p_c: np.ndarray, p_l: np.ndarray, r: np.ndarray) -> np.ndarray:
        """
        Creates meta-learner feature vector:
        [p_C, p_L, r, p_L * r, (p_C - p_L) * r]
        """
        p_c = p_c.reshape(-1, 1)
        p_l = p_l.reshape(-1, 1)
        r = r.reshape(-1, 1)
        
        if self.include_reliability:
            p_l_r = p_l * r
            diff_r = (p_c - p_l) * r
            return np.hstack([p_c, p_l, r, p_l_r, diff_r])
        else:
            return np.hstack([p_c, p_l])
            
    def fit(self, X_c: np.ndarray, X_l: np.ndarray, r: np.ndarray, y: np.ndarray, n_folds: int = 5):
        """
        Fits clinical and lifestyle branches using nested cross-validation to produce
        leak-free out-of-fold probability predictions for the meta-learner.
        """
        cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=self.random_state)
        oof_p_c = np.zeros(len(y))
        oof_p_l = np.zeros(len(y))
        
        # 1. Out-of-fold generation for meta-learner
        for train_idx, val_idx in cv.split(X_c, y):
            # Clinical fold
            clf_c = get_base_model(self.clinical_model_name, self.random_state)
            clf_c.fit(X_c[train_idx], y[train_idx])
            oof_p_c[val_idx] = clf_c.predict_proba(X_c[val_idx])[:, 1]
            
            # Lifestyle fold
            clf_l = get_base_model(self.lifestyle_model_name, self.random_state)
            clf_l.fit(X_l[train_idx], y[train_idx])
            oof_p_l[val_idx] = clf_l.predict_proba(X_l[val_idx])[:, 1]
            
        # 2. Fit the regularized Logistic Regression Meta-Learner
        meta_X = self._create_meta_features(oof_p_c, oof_p_l, r)
        meta_X_scaled = self.meta_scaler.fit_transform(meta_X)
        self.meta_learner = LogisticRegression(C=1.0, max_iter=1000, random_state=self.random_state)
        self.meta_learner.fit(meta_X_scaled, y)
        
        # 3. Fit full branches on all data
        self.clinical_branch = get_base_model(self.clinical_model_name, self.random_state)
        self.clinical_branch.fit(X_c, y)
        
        self.lifestyle_branch = get_base_model(self.lifestyle_model_name, self.random_state)
        self.lifestyle_branch.fit(X_l, y)
        
        return self
        
    def predict_branches(self, X_c: np.ndarray, X_l: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Returns individual calibrated probabilities (p_c, p_l)."""
        p_c = self.clinical_branch.predict_proba(X_c)[:, 1]
        p_l = self.lifestyle_branch.predict_proba(X_l)[:, 1]
        return p_c, p_l

    def predict_proba(self, X_c: np.ndarray, X_l: np.ndarray, r: np.ndarray) -> np.ndarray:
        """Returns fused cardiovascular risk probabilities [p0, p1]."""
        p_c, p_l = self.predict_branches(X_c, X_l)
        meta_X = self._create_meta_features(p_c, p_l, r)
        meta_X_scaled = self.meta_scaler.transform(meta_X)
        return self.meta_learner.predict_proba(meta_X_scaled)
        
    def predict(self, X_c: np.ndarray, X_l: np.ndarray, r: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        proba = self.predict_proba(X_c, X_l, r)[:, 1]
        return (proba >= threshold).astype(int)

    def get_meta_weights(self) -> Dict[str, float]:
        """Returns interpretable meta-learner weights."""
        coefs = self.meta_learner.coef_[0]
        if self.include_reliability:
            names = ['p_clinical', 'p_lifestyle', 'reliability_r', 'lifestyle_x_r', 'diff_x_r']
        else:
            names = ['p_clinical', 'p_lifestyle']
        return {name: float(round(coef, 4)) for name, coef in zip(names, coefs)}
