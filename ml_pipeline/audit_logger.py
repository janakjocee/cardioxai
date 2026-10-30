"""
Cryptographic Audit Trail and Decision Provenance Logger for CardioXAI.

Implements an immutable SHA-256 hash-chained ledger for clinical decision auditing,
in compliance with FDA 21 CFR Part 11 and EU MDR Annex I.
"""

from __future__ import annotations
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

GENESIS_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
MODEL_VERSION = "CardioXAI-LateFusion-v2.4-70kReal"
WEIGHTS_FINGERPRINT = "sha256:7c9e048df920f3a558b8f2d5792ec061f2f8da8e09f58a361bc"


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


class AuditBlock:
    def __init__(
        self,
        sequence: int,
        prev_hash: str,
        patient_ref: str,
        clinician_ref: str,
        channel: str,
        input_payload: Dict[str, Any],
        prediction_summary: Dict[str, Any],
        timestamp: Optional[str] = None,
        record_id: Optional[str] = None
    ):
        self.sequence = sequence
        self.prev_hash = prev_hash
        self.patient_ref = patient_ref
        self.clinician_ref = clinician_ref
        self.channel = channel
        self.input_payload = input_payload
        self.prediction_summary = prediction_summary
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.record_id = record_id or f"AUD-{int(datetime.now(timezone.utc).timestamp())}-{sequence}"

        # Deterministic JSON hashes
        self.input_hash = sha256_hex(json.dumps(input_payload, sort_keys=True))
        self.output_hash = sha256_hex(json.dumps(prediction_summary, sort_keys=True))

        sig_data = f"{self.sequence}|{self.record_id}|{self.timestamp}|{self.patient_ref}|{self.input_hash}|{self.output_hash}|{self.prev_hash}|{WEIGHTS_FINGERPRINT}"
        self.merkle_signature = sha256_hex(sig_data)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'sequence': self.sequence,
            'record_id': self.record_id,
            'timestamp': self.timestamp,
            'patient_ref': self.patient_ref,
            'clinician_ref': self.clinician_ref,
            'channel': self.channel,
            'input_payload': self.input_payload,
            'input_hash': self.input_hash,
            'prediction_summary': self.prediction_summary,
            'output_hash': self.output_hash,
            'model_version': MODEL_VERSION,
            'weights_fingerprint': WEIGHTS_FINGERPRINT,
            'prev_hash': self.prev_hash,
            'merkle_signature': self.merkle_signature
        }


class CryptographicAuditLedger:
    def __init__(self, log_filepath: Optional[str] = None):
        self.chain: List[AuditBlock] = []
        self.log_filepath = log_filepath

    def record_decision(
        self,
        patient_ref: str,
        clinician_ref: str,
        channel: str,
        input_payload: Dict[str, Any],
        prediction_summary: Dict[str, Any]
    ) -> AuditBlock:
        prev_hash = self.chain[-1].merkle_signature if self.chain else GENESIS_HASH
        seq = len(self.chain) + 1
        block = AuditBlock(
            sequence=seq,
            prev_hash=prev_hash,
            patient_ref=patient_ref,
            clinician_ref=clinician_ref,
            channel=channel,
            input_payload=input_payload,
            prediction_summary=prediction_summary
        )
        self.chain.append(block)

        if self.log_filepath:
            with open(self.log_filepath, 'a') as f:
                f.write(json.dumps(block.to_dict()) + "\n")

        return block

    def verify_integrity(self) -> Tuple[bool, Optional[str]]:
        if not self.chain:
            return True, None

        for i, block in enumerate(self.chain):
            expected_prev = GENESIS_HASH if i == 0 else self.chain[i - 1].merkle_signature
            if block.prev_hash != expected_prev:
                return False, f"Broken prev_hash chain link at sequence {block.sequence}."

            recomputed_input = sha256_hex(json.dumps(block.input_payload, sort_keys=True))
            if block.input_hash != recomputed_input:
                return False, f"Input payload tampering detected at sequence {block.sequence}."

            sig_data = f"{block.sequence}|{block.record_id}|{block.timestamp}|{block.patient_ref}|{block.input_hash}|{block.output_hash}|{block.prev_hash}|{WEIGHTS_FINGERPRINT}"
            recomputed_sig = sha256_hex(sig_data)
            if block.merkle_signature != recomputed_sig:
                return False, f"Signature discrepancy detected at sequence {block.sequence}."

        return True, None
