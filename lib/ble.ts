/**
 * Web Bluetooth (BLE) Peripherals Connector for CardioXAI.
 * 
 * Standards Compliance:
 * - Bluetooth SIG GATT Assigned Numbers
 * - Heart Rate Service (0x180D) & Heart Rate Measurement (0x2A37)
 * - Blood Pressure Service (0x1810) & Blood Pressure Measurement (0x2A35)
 * - Battery Service (0x180F) & Battery Level (0x2A19)
 * 
 * Directly connects browser to physical medical peripherals:
 * - Omron / Withings connected blood pressure cuffs
 * - Polar H10 / Garmin chest straps and optical pulse sensors
 */

export interface BLEHeartRateData {
  heartRate: number;
  contactDetected?: boolean;
  energyExpended?: number;
  rrIntervals?: number[];
  timestamp: string;
}

export interface BLEBloodPressureData {
  systolic: number;     // mmHg
  diastolic: number;    // mmHg
  meanArterialPressure: number; // mmHg
  pulseRate?: number;   // bpm
  timestamp: string;
}

export interface BLEDeviceState {
  connected: boolean;
  deviceName: string | null;
  deviceId: string | null;
  batteryLevel: number | null;
  servicesFound: string[];
  lastError: string | null;
}

// Bluetooth SIG GATT UUIDs
export const GATT_SERVICES = {
  HEART_RATE: 0x180D,
  BLOOD_PRESSURE: 0x1810,
  BATTERY: 0x180F,
  USER_DATA: 0x181C
};

export const GATT_CHARACTERISTICS = {
  HEART_RATE_MEASUREMENT: 0x2A37,
  BLOOD_PRESSURE_MEASUREMENT: 0x2A35,
  INTERMEDIATE_CUFF_PRESSURE: 0x2A36,
  BATTERY_LEVEL: 0x2A19
};

/**
 * Checks whether Web Bluetooth API is supported by the user's browser.
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Parses binary data packet from Heart Rate Measurement Characteristic (0x2A37).
 */
export function parseHeartRateData(value: DataView): BLEHeartRateData {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const contactDetected = (flags & 0x06) === 0x06;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRR = (flags & 0x10) !== 0;

  let offset = 1;
  let hr = 0;
  if (is16Bit) {
    hr = value.getUint16(offset, true);
    offset += 2;
  } else {
    hr = value.getUint8(offset);
    offset += 1;
  }

  let energyExpended: number | undefined;
  if (hasEnergy) {
    energyExpended = value.getUint16(offset, true);
    offset += 2;
  }

  const rrIntervals: number[] = [];
  if (hasRR) {
    while (offset + 1 < value.byteLength) {
      const rr = value.getUint16(offset, true);
      // RR-interval in 1/1024 seconds converted to milliseconds
      rrIntervals.push(Math.round((rr / 1024) * 1000));
      offset += 2;
    }
  }

  return {
    heartRate: hr,
    contactDetected,
    energyExpended,
    rrIntervals: rrIntervals.length > 0 ? rrIntervals : undefined,
    timestamp: new Date().toISOString()
  };
}

/**
 * Parses binary data packet from Blood Pressure Measurement Characteristic (0x2A35).
 */
export function parseBloodPressureData(value: DataView): BLEBloodPressureData {
  const flags = value.getUint8(0);
  const isKPa = (flags & 0x01) !== 0;
  const hasTimestamp = (flags & 0x02) !== 0;
  const hasPulseRate = (flags & 0x04) !== 0;

  let offset = 1;

  // In SFLOAT format (IEEE-11073 16-bit float)
  const sbpRaw = value.getFloat32 ? value.getUint16(offset, true) : value.getUint16(offset, true);
  offset += 2;
  const dbpRaw = value.getUint16(offset, true);
  offset += 2;
  const mapRaw = value.getUint16(offset, true);
  offset += 2;

  // Conversion: 1 kPa = 7.50062 mmHg
  const multiplier = isKPa ? 7.50062 : 1.0;
  const sbp = Math.round(sbpRaw * multiplier);
  const dbp = Math.round(dbpRaw * multiplier);
  const map = Math.round(mapRaw * multiplier);

  if (hasTimestamp) {
    offset += 7; // Year(2), Month(1), Day(1), Hour(1), Minute(1), Second(1)
  }

  let pulseRate: number | undefined;
  if (hasPulseRate && offset + 1 <= value.byteLength) {
    pulseRate = value.getUint16(offset, true);
  }

  return {
    systolic: sbp,
    diastolic: dbp,
    meanArterialPressure: map,
    pulseRate,
    timestamp: new Date().toISOString()
  };
}

/**
 * High-level Web Bluetooth Peripheral Connection Manager.
 */
export class WebBLEManager {
  private device: any = null;
  private server: any = null;
  private state: BLEDeviceState = {
    connected: false,
    deviceName: null,
    deviceId: null,
    batteryLevel: null,
    servicesFound: [],
    lastError: null
  };

  private hrListeners: Array<(data: BLEHeartRateData) => void> = [];
  private bpListeners: Array<(data: BLEBloodPressureData) => void> = [];
  private stateListeners: Array<(state: BLEDeviceState) => void> = [];

  public getState(): BLEDeviceState {
    return { ...this.state };
  }

  public onStateChange(listener: (state: BLEDeviceState) => void) {
    this.stateListeners.push(listener);
    listener(this.getState());
  }

  public onHeartRate(listener: (data: BLEHeartRateData) => void) {
    this.hrListeners.push(listener);
  }

  public onBloodPressure(listener: (data: BLEBloodPressureData) => void) {
    this.bpListeners.push(listener);
  }

  private updateState(partial: Partial<BLEDeviceState>) {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach(l => l(this.getState()));
  }

  /**
   * Prompts the browser's Bluetooth scanner for connected medical peripherals.
   */
  public async requestPeripheral(): Promise<boolean> {
    if (!isWebBluetoothSupported()) {
      this.updateState({ lastError: 'Web Bluetooth is not supported in this browser (Use Chrome or Edge).' });
      return false;
    }

    try {
      const nav = navigator as any;
      this.device = await nav.bluetooth.requestDevice({
        filters: [
          { services: [GATT_SERVICES.HEART_RATE] },
          { services: [GATT_SERVICES.BLOOD_PRESSURE] },
          { namePrefix: 'Polar' },
          { namePrefix: 'Omron' },
          { namePrefix: 'Withings' }
        ],
        optionalServices: [
          GATT_SERVICES.HEART_RATE,
          GATT_SERVICES.BLOOD_PRESSURE,
          GATT_SERVICES.BATTERY
        ]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.updateState({ connected: false, lastError: 'Device disconnected.' });
      });

      return await this.connect();
    } catch (err: any) {
      this.updateState({ lastError: err?.message || 'Bluetooth connection cancelled.' });
      return false;
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.device) return false;

    try {
      this.server = await this.device.gatt.connect();
      const servicesFound: string[] = [];

      // Check Heart Rate Service
      try {
        const hrService = await this.server.getPrimaryService(GATT_SERVICES.HEART_RATE);
        servicesFound.push('Heart Rate (0x180D)');
        const hrChar = await hrService.getCharacteristic(GATT_CHARACTERISTICS.HEART_RATE_MEASUREMENT);
        await hrChar.startNotifications();
        hrChar.addEventListener('characteristicvaluechanged', (e: any) => {
          const val: DataView = e.target.value;
          const parsed = parseHeartRateData(val);
          this.hrListeners.forEach(fn => fn(parsed));
        });
      } catch (e) {
        // Heart rate service optional
      }

      // Check Blood Pressure Service
      try {
        const bpService = await this.server.getPrimaryService(GATT_SERVICES.BLOOD_PRESSURE);
        servicesFound.push('Blood Pressure (0x1810)');
        const bpChar = await bpService.getCharacteristic(GATT_CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT);
        await bpChar.startNotifications();
        bpChar.addEventListener('characteristicvaluechanged', (e: any) => {
          const val: DataView = e.target.value;
          const parsed = parseBloodPressureData(val);
          this.bpListeners.forEach(fn => fn(parsed));
        });
      } catch (e) {
        // Blood pressure service optional
      }

      // Check Battery Service
      try {
        const batService = await this.server.getPrimaryService(GATT_SERVICES.BATTERY);
        const batChar = await batService.getCharacteristic(GATT_CHARACTERISTICS.BATTERY_LEVEL);
        const val = await batChar.readValue();
        this.updateState({ batteryLevel: val.getUint8(0) });
      } catch (e) {
        // Battery service optional
      }

      this.updateState({
        connected: true,
        deviceName: this.device.name || 'Generic Medical BLE Device',
        deviceId: this.device.id,
        servicesFound,
        lastError: null
      });

      return true;
    } catch (err: any) {
      this.updateState({ connected: false, lastError: `GATT Connection failed: ${err?.message}` });
      return false;
    }
  }

  public disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.updateState({ connected: false, deviceName: null, deviceId: null, servicesFound: [] });
  }
}

// Global shared singleton for application-wide Web Bluetooth state
export const globalBLEManager = new WebBLEManager();
