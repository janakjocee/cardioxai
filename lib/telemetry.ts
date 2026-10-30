/**
 * Real-Time Telemetry & Sliding Window Hemodynamic Processing Engine.
 * 
 * Simulates and processes continuous ambulatory wearable and ICU patient telemetry streams:
 * - High-frequency vital signs: Heart Rate (bpm), SBP (mmHg), DBP (mmHg), SpO2 (%), Activity (METs)
 * - Moving temporal window hemodynamic calculations:
 *   - Mean Arterial Pressure: MAP = DBP + (SBP - DBP)/3
 *   - Pulse Pressure: PP = SBP - DBP
 *   - Rate Pressure Product: RPP = (HR * SBP) / 100 (Myocardial oxygen demand)
 *   - Circadian & Diurnal trend analysis
 * - Dynamic sensor reliability evaluation:
 *   - Detects PPG motion artifact, sensor disconnect, and physiological incongruence
 *   - Adjusts the Lifestyle Reliability Score r in real-time
 */

export interface TelemetryReading {
  tick: number;
  timestamp: string;
  heart_rate: number;         // bpm
  ap_hi: number;              // SBP mmHg
  ap_lo: number;              // DBP mmHg
  spo2: number;               // %
  motion_level: number;       // 0 (still) to 5 (vigorous)
  sensor_contact_quality: number; // 0.0 to 1.0
  active: 0 | 1;
  smoke_event: 0 | 1;
  derived: {
    map: number;
    pulse_pressure: number;
    rpp: number;              // Rate Pressure Product
    moving_sbp_5pt: number;
    moving_dbp_5pt: number;
    reliability_score: number;
  };
  prediction: {
    fused_probability: number;
    clinical_branch_prob: number;
    lifestyle_branch_prob: number;
    risk_tier: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Stage Risk';
    risk_color: 'emerald' | 'blue' | 'amber' | 'red';
    alert: TelemetryAlert | null;
  };
}

export interface TelemetryAlert {
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'HYPERTENSIVE_CRISIS' | 'MALIGNANT_PULSE_PRESSURE' | 'MYOCARDIAL_STRAIN' | 'SENSOR_DEGRADATION';
  headline: string;
  sbar_recommendation: string;
  action_required: boolean;
}

export type TelemetryScenario = 
  | 'hypertensive_surge'
  | 'post_infarction_recovery'
  | 'sensor_artifact_noise'
  | 'ambulatory_circadian_normal';

export class TelemetryStreamSimulator {
  private tickCount = 0;
  private sbpHistory: number[] = [];
  private dbpHistory: number[] = [];
  private baseAge: number;
  private baseGender: number;
  private baseWeight: number;
  private baseHeight: number;
  private baseChol: number;
  private baseGluc: number;
  private scenario: TelemetryScenario;

  constructor(scenario: TelemetryScenario = 'hypertensive_surge') {
    this.scenario = scenario;
    this.baseAge = 56;
    this.baseGender = 2; // Male
    this.baseWeight = 82;
    this.baseHeight = 172;
    this.baseChol = 2;
    this.baseGluc = 1;
  }

  public setScenario(newScenario: TelemetryScenario) {
    this.scenario = newScenario;
  }

  public nextTick(): TelemetryReading {
    this.tickCount++;
    const t = this.tickCount;
    const now = new Date().toISOString();

    let hr = 72;
    let sbp = 135;
    let dbp = 86;
    let spo2 = 98;
    let motion = 1;
    let sensorQuality = 0.98;
    let smokeEvent: 0 | 1 = 0;
    let activeState: 0 | 1 = 0;

    // Apply scenario dynamics
    if (this.scenario === 'hypertensive_surge') {
      // Patient experiences acute exertion & nicotine spike around tick 10-25
      const phase = Math.min(1.0, Math.max(0.0, (t % 40) / 20));
      const surge = Math.sin(phase * Math.PI) * 38; // rises up to +38 mmHg
      sbp = Math.round(135 + surge + (Math.sin(t * 0.8) * 3));
      dbp = Math.round(86 + (surge * 0.45) + (Math.cos(t * 0.8) * 2));
      hr = Math.round(72 + (surge * 0.8) + (Math.sin(t * 1.2) * 4));
      spo2 = Math.round(98 - (surge * 0.05));
      smokeEvent = t % 40 > 12 && t % 40 < 28 ? 1 : 0;
      activeState = t % 40 > 8 && t % 40 < 30 ? 1 : 0;
      motion = activeState ? 3 : 1;
    } else if (this.scenario === 'post_infarction_recovery') {
      // Patient resting post-therapy, vitals smoothly stabilizing
      const decay = Math.exp(-((t % 40) / 15));
      sbp = Math.round(124 + (decay * 32) + (Math.sin(t * 0.4) * 2));
      dbp = Math.round(78 + (decay * 18) + (Math.cos(t * 0.4) * 2));
      hr = Math.round(66 + (decay * 24) + (Math.sin(t * 0.7) * 2));
      spo2 = 99;
      motion = 1;
      sensorQuality = 0.99;
    } else if (this.scenario === 'sensor_artifact_noise') {
      // Movement noise: sensor quality dips, SBP fluctuates erratically
      sbp = Math.round(128 + (Math.sin(t * 1.5) * 22));
      dbp = Math.round(82 + (Math.cos(t * 1.5) * 14));
      hr = Math.round(74 + (Math.sin(t * 2.1) * 18));
      sensorQuality = t % 20 > 8 && t % 20 < 16 ? 0.35 : 0.96;
      motion = sensorQuality < 0.5 ? 4 : 1;
      spo2 = sensorQuality < 0.5 ? 94 : 98;
    } else {
      // Normal diurnal rhythm
      sbp = Math.round(122 + (Math.sin(t * 0.2) * 5) + (Math.cos(t * 0.5) * 2));
      dbp = Math.round(78 + (Math.sin(t * 0.2) * 3));
      hr = Math.round(68 + (Math.sin(t * 0.3) * 4));
      spo2 = 99;
      sensorQuality = 0.99;
    }

    // Hemodynamic calculations
    const pp = sbp - dbp;
    const map = Math.round((dbp + (pp / 3.0)) * 10) / 10;
    const rpp = Math.round((hr * sbp) / 100);

    // Sliding window 5-point moving averages
    this.sbpHistory.push(sbp);
    this.dbpHistory.push(dbp);
    if (this.sbpHistory.length > 5) this.sbpHistory.shift();
    if (this.dbpHistory.length > 5) this.dbpHistory.shift();

    const movingSbp = Math.round((this.sbpHistory.reduce((a, b) => a + b, 0) / this.sbpHistory.length) * 10) / 10;
    const movingDbp = Math.round((this.dbpHistory.reduce((a, b) => a + b, 0) / this.dbpHistory.length) * 10) / 10;

    // Real-Time Reliability Score computation (Section 3.6.2)
    let r = 1.0;
    if (sensorQuality < 0.6) {
      r -= 0.35; // Sensor contact degradation penalty
    }
    if (motion > 3 && pp > 80) {
      r -= 0.20; // High motion artifact discrepancy
    }
    r = Math.max(0.40, Math.min(1.0, Math.round(r * 100) / 100));

    // Real-time Late-Fusion calculation
    const h_m = this.baseHeight / 100.0;
    const bmi = Math.round((this.baseWeight / (h_m * h_m)) * 10) / 10;
    const bmi_x_active = Math.round(bmi * (1 - activeState) * 10) / 10;
    const ap_hi_x_smoke = Math.round(Math.max(0, sbp - 120) * smokeEvent * 10) / 10;

    // Clinical branch p_C
    const z_c = (
      -0.08
      + 0.054 * (this.baseAge - 53.0)
      + 0.046 * (sbp - 128.0)
      + 0.024 * (dbp - 82.0)
      + 0.52 * (this.baseChol - 1)
      + 0.35 * (this.baseGluc - 1)
      + 0.048 * (bmi - 27.5)
      + 0.015 * (pp - 45.0)
      + 0.018 * bmi_x_active
      + 0.014 * ap_hi_x_smoke
    );
    const p_c = Math.round((1.0 / (1.0 + Math.exp(-z_c))) * 1000) / 1000;

    // Lifestyle branch p_L
    const z_l = (
      -0.12
      + 0.038 * (this.baseAge - 53.0)
      + 0.54 * smokeEvent
      + 0.30 * 0 // alco
      - 0.50 * (activeState - 0.8)
      - 0.20 * (3 - 3) // diet 3
      + 0.024 * (bmi * (1 - activeState))
    );
    const p_l = Math.round((1.0 / (1.0 + Math.exp(-z_l))) * 1000) / 1000;

    // Fused Meta-Learner (Kaggle 70k authentic parameters)
    const scaler_mean = [0.4921, 0.4924, 1.0, 0.4924, -0.0003];
    const scaler_scale = [0.2619, 0.1477, 0.0011, 0.1477, 0.2299];
    const meta_weights = [0.6048, 0.1973, -0.0539, 0.1971, 0.5622];
    const meta_intercept = -0.0163;

    const raw_meta = [p_c, p_l, r, p_l * r, (p_c - p_l) * r];
    let z_meta = meta_intercept;
    for (let i = 0; i < raw_meta.length; i++) {
      const scaled = (raw_meta[i] - scaler_mean[i]) / scaler_scale[i];
      z_meta += meta_weights[i] * scaled;
    }
    const fused_prob = Math.round((1.0 / (1.0 + Math.exp(-z_meta))) * 1000) / 1000;

    // Assigned tier
    let risk_tier: TelemetryReading['prediction']['risk_tier'] = 'Low Risk';
    let risk_color: TelemetryReading['prediction']['risk_color'] = 'emerald';
    if (fused_prob >= 0.75) {
      risk_tier = 'Critical Stage Risk';
      risk_color = 'red';
    } else if (fused_prob >= 0.50) {
      risk_tier = 'High Risk';
      risk_color = 'amber';
    } else if (fused_prob >= 0.25) {
      risk_tier = 'Moderate Risk';
      risk_color = 'blue';
    }

    // Clinical early warning alerts
    let alert: TelemetryAlert | null = null;
    if (sbp >= 170 || dbp >= 105) {
      alert = {
        level: 'CRITICAL',
        type: 'HYPERTENSIVE_CRISIS',
        headline: `Acute Hypertensive Emergency Detected (SBP: ${sbp} mmHg)`,
        sbar_recommendation: `S: SBP spiked to ${sbp}/${dbp} mmHg with HR ${hr} bpm. B: Patient history of Stage-2 HTN and smoking. A: Fused risk ${Math.round(fused_prob*100)}% (Critical). R: Immediate cardiology bedside consult; prepare labetalol/hydralazine protocol.`,
        action_required: true
      };
    } else if (pp >= 65 && hr >= 95) {
      alert = {
        level: 'WARNING',
        type: 'MALIGNANT_PULSE_PRESSURE',
        headline: `Elevated Pulse Pressure (${pp} mmHg) with Sinus Tachycardia`,
        sbar_recommendation: `S: Widened pulse pressure indicates increased arterial stiffening and cardiac preload. R: Order 12-lead ECG and verify electrolyte levels.`,
        action_required: true
      };
    } else if (sensorQuality < 0.5) {
      alert = {
        level: 'INFO',
        type: 'SENSOR_DEGRADATION',
        headline: `Wearable Artifact Detected (Quality: ${Math.round(sensorQuality*100)}%)`,
        sbar_recommendation: `Late-fusion engine automatically attenuated lifestyle modality weight to ${Math.round(r*100)}%. Reposition pulse oximeter / cuff sensor.`,
        action_required: false
      };
    }

    return {
      tick: t,
      timestamp: now,
      heart_rate: hr,
      ap_hi: sbp,
      ap_lo: dbp,
      spo2,
      motion_level: motion,
      sensor_contact_quality: sensorQuality,
      active: activeState,
      smoke_event: smokeEvent,
      derived: {
        map,
        pulse_pressure: pp,
        rpp,
        moving_sbp_5pt: movingSbp,
        moving_dbp_5pt: movingDbp,
        reliability_score: r
      },
      prediction: {
        fused_probability: fused_prob,
        clinical_branch_prob: p_c,
        lifestyle_branch_prob: p_l,
        risk_tier,
        risk_color,
        alert
      }
    };
  }
}
