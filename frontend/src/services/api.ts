import axios from 'axios';

// API Base URL - change this if backend runs on different port
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s for regular requests (health, history, status)
});

// Longer timeouts for scan endpoints
const SCAN_TIMEOUT_CODE = 300000;  // 5 min  — code scans
const SCAN_TIMEOUT_IAC  = 900000;  // 15 min — IaC scans (Checkov on large Terraform repos)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScanResult {
  path?: string;
  start?: { line: number; col: number };
  end?: { line: number; col: number };
  check_id?: string;
  extra?: {
    message?: string;
    severity?: string;
    metadata?: {
      cwe?: string[];
      owasp?: string[];
    };
  };
}

export interface IaCFinding {
  check_id?: string;
  check_name?: string;
  file_path?: string;
  severity?: string;
  guideline?: string;
  resource?: string;
  description?: string;
}

export interface ScanResponse {
  scan_id?: string;
  status: string;
  repository: string;
  summary: string;
  llm_analysis: string;
  stored_in_mem0: number;
  // Code scan results (from /scan and /scan-github)
  results?: ScanResult[];
  // IaC scan results (from /scan-iac)
  failed_checks?: IaCFinding[];
  passed_checks_count?: number;
  related_previous_scans?: any[];
}

export interface HealthStatus {
  api: string;
  gemini: string;
  mem0: string;
  model: string;
  timestamp: string;
  status: 'healthy' | 'degraded';
}

export interface ScanHistoryItem {
  id: string;
  content: string;
  metadata: {
    repo?: string;
    file?: string;
    severity?: string;
    rule_id?: string;
    type?: string;
    scanned_at?: string;
  };
  created_at: string;
}

export interface ScanHistoryResponse {
  status: string;
  count: number;
  history: ScanHistoryItem[];
}

export interface ScanStatusResponse {
  scan_id: string;
  status: 'running' | 'completed' | 'failed';
  repo?: string;
  started_at?: string;
}

export interface ApiError {
  detail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function handleApiError(error: unknown, fallbackMessage: string): never {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    throw new Error(apiError?.detail || fallbackMessage);
  }
  throw error;
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Root endpoint — simple reachability check
 */
export const healthCheck = async (): Promise<{ message: string }> => {
  try {
    const response = await apiClient.get('/');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

/**
 * /health — detailed health check (Gemini + Mem0 status)
 */
export const getHealthStatus = async (): Promise<HealthStatus> => {
  try {
    const response = await apiClient.get<HealthStatus>('/health');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Health check failed');
  }
};

/**
 * POST /scan — scan a local filesystem path with Semgrep
 */
export const scanLocalPath = async (path: string): Promise<ScanResponse> => {
  try {
    const response = await apiClient.post<ScanResponse>('/scan', { path }, { timeout: SCAN_TIMEOUT_CODE });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to scan path');
  }
};

/**
 * POST /scan-github — clone + Semgrep scan a GitHub repo
 */
export const scanGithubRepo = async (repoUrl: string): Promise<ScanResponse> => {
  try {
    const response = await apiClient.post<ScanResponse>(
      '/scan-github',
      { repo_url: repoUrl },
      { timeout: SCAN_TIMEOUT_CODE }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to scan repository');
  }
};

/**
 * POST /scan-iac — clone + Checkov IaC scan a GitHub repo
 */
export const scanIaC = async (repoUrl: string): Promise<ScanResponse> => {
  try {
    const response = await apiClient.post<ScanResponse>(
      '/scan-iac',
      { repo_url: repoUrl },
      { timeout: SCAN_TIMEOUT_IAC }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to scan IaC');
  }
};

/**
 * GET /scan-history — retrieve past scan results from Mem0
 */
export const getScanHistory = async (limit = 20): Promise<ScanHistoryResponse> => {
  try {
    const response = await apiClient.get<ScanHistoryResponse>('/scan-history', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch scan history');
  }
};

/**
 * GET /scan-status/{id} — get status of an in-progress or completed scan
 */
export const getScanStatus = async (scanId: string): Promise<ScanStatusResponse> => {
  try {
    const response = await apiClient.get<ScanStatusResponse>(`/scan-status/${scanId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, `Failed to fetch status for scan ${scanId}`);
  }
};

export default apiClient;
