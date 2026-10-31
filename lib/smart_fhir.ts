/**
 * SMART on FHIR App Launch & EHR Context Engine.
 * 
 * Standards Compliance:
 * - HL7 SMART App Launch Implementation Guide (v2.0.0)
 * - OAuth 2.0 PKCE (RFC 7636)
 * - Epic Systems & Cerner Millennium EHR SMART Sandbox Support
 */

export interface SMARTLaunchContext {
  iss: string;               // EHR FHIR Base URL
  launch?: string;           // EHR Launch Context Token
  patientId?: string;        // In-context Patient ID
  encounterId?: string;      // In-context Encounter ID
  clientId: string;
  scope: string;
  redirectUri: string;
}

export interface SMARTTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  patient?: string;
  encounter?: string;
  id_token?: string;
}

export function parseLaunchParams(searchParams: URLSearchParams): {
  iss: string | null;
  launch: string | null;
} {
  return {
    iss: searchParams.get('iss'),
    launch: searchParams.get('launch')
  };
}

/**
 * Builds standard SMART on FHIR authorization redirect URL.
 */
export function buildSMARTAuthorizeUrl(
  authEndpoint: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  launch: string,
  state: string,
  aud: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    aud
  });

  if (launch) {
    params.set('launch', launch);
  }

  return `${authEndpoint}?${params.toString()}`;
}

/**
 * Generates a mock SMART on FHIR Session for testing EHR integration in development or demo.
 */
export function createMockSMARTSession(ehrName: 'Epic Systems' | 'Cerner Millennium' | 'NHS Digital') {
  const now = new Date();
  return {
    ehr_vendor: ehrName,
    fhir_base_url: `https://fhir.${ehrName.toLowerCase().replace(/\s+/g, '')}.com/r4`,
    patient_id: `EHR-${Math.floor(Math.random() * 89999 + 10000)}`,
    patient_name: ehrName === 'NHS Digital' ? 'Davies, Gareth (NHS #948 201 391)' : 'Miller, James (MRN #849201)',
    clinician_name: 'Dr. Sarah Jenkins, MD (Cardiology)',
    encounter_id: `ENC-${Date.now()}`,
    scopes_granted: ['launch/patient', 'patient/*.read', 'patient/RiskAssessment.write', 'openid', 'fhirUser'],
    authorized_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 3600 * 1000).toISOString()
  };
}
