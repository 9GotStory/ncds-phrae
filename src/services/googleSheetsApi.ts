// Google Sheets API Integration Service
const API_URL =
  "https://script.google.com/macros/s/AKfycbz5vY2N5piXcY6ZVdaKBkS_aSqWdivUa-Xm_4H5JH7DTuj9QDQFkb1GlqojUzV2XtDstA/exec";

const AUTH_INVALIDATED_EVENT = "auth:invalidated";

export type UserRole = "admin" | "officer" | "viewer";
export type UserStatus = "active" | "inactive" | "pending";

export interface User {
  id: string;
  username: string;
  name: string;
  district: string;
  role: UserRole;
  status: UserStatus;
}

export interface ManagedUser extends User {
  approvedBy?: string;
  approvedAt?: string;
  lastLogin?: string;
}

export interface SessionInfo {
  createdAt: string;
  lastAccess: string;
  sessionTimeout: number;
  maxSessionDuration: number;
  idleExpiresAt: string;
  expiresAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  session?: SessionInfo | null;
  message?: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  name: string;
  district: string;
  role?: UserRole;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface DashboardStatsCard {
  key: string;
  title: string;
  value: number;
  percentage: number;
  variant: "default" | "success" | "warning" | "destructive";
}

export interface DashboardChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  tension?: number;
  fill?: boolean;
}

export interface DashboardChartData {
  labels: string[];
  datasets: DashboardChartDataset[];
}

export interface DashboardDistrict {
  id: string;
  name: string;
  normal: number;
  risk: number;
  sick: number;
  referCount?: number;
  x?: number;
  y?: number;
}

export interface DashboardCategory {
  key: string;
  name: string;
  total: number;
  unit?: string;
  normal: number;
  risk: number;
  sick: number;
  baseline?: {
    total?: number;
    normal?: number;
    risk?: number;
    sick?: number;
  };
  adjusted?: {
    total?: number;
    normal?: number;
    risk?: number;
    sick?: number;
  };
  diff?: {
    total?: number;
    normal?: number;
    risk?: number;
    sick?: number;
  };
}

export interface DashboardDetailRow {
  id?: string;
  district: string;
  subdistrict: string;
  village: string;
  moo?: string;
  year?: number;
  month?: number;
  period?: string;
  normal: number;
  risk: number;
  sick: number;
  total?: number;
  referCount?: number;
}

export interface DashboardComparisonArea {
  name: string;
  stats: {
    normal: number;
    risk: number;
    sick: number;
  };
}

export interface DashboardAvailability {
  districts: string[];
  years: number[];
  periods: Array<{ key: string; label: string }>;
  subdistrictsByDistrict: Record<string, string[]>;
  villagesBySubdistrict: Record<string, string[]>;
}

export interface DashboardMetadata {
  period: string;
  province: string;
  targetGroup: string;
  hasData: boolean;
  recordCount: number;
  filtersApplied?: Record<string, unknown>;
  warning?: string;
}

export interface DashboardDetailParams {
  targetGroup?: string;
  district?: string;
  subdistrict?: string;
  village?: string;
  period?: string;
  startPeriod?: string;
  endPeriod?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DashboardDetailRecordsPage {
  items: DashboardDetailRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DashboardDetailData {
  summary: {
    normal: number;
    risk: number;
    sick: number;
    total: number;
  };
  metadata: DashboardMetadata;
  availability: DashboardAvailability;
  records: DashboardDetailRecordsPage;
}

export interface DashboardData {
  metadata: DashboardMetadata;
  summary: {
    normal: number;
    risk: number;
    sick: number;
    total: number;
  };
  stats: DashboardStatsCard[];
  barChart: DashboardChartData;
  lineChart: DashboardChartData;
  categories: DashboardCategory[];
  districts: DashboardDistrict[];
  detailTable: DashboardDetailRow[];
  comparison: {
    areas: DashboardComparisonArea[];
  };
  adjustments?: DashboardAdjustmentsData;
  availability?: DashboardAvailability;
}

export interface DashboardAdjustmentMetrics {
  normal: number;
  risk: number;
  sick: number;
  total: number;
}

export interface DashboardAdjustmentSummary {
  baseline: DashboardAdjustmentMetrics;
  adjusted: DashboardAdjustmentMetrics;
  diff: DashboardAdjustmentMetrics;
  latestEntry?: NcdAdjustmentEntry;
}

export interface DashboardAdjustmentCategorySummary {
  key: string;
  name: string;
  unit?: string;
  baseline: DashboardAdjustmentMetrics;
  adjusted: DashboardAdjustmentMetrics;
  diff: DashboardAdjustmentMetrics;
}

export interface DashboardAdjustmentDistrictSummary {
  id?: string;
  name?: string;
  baseline: DashboardAdjustmentMetrics;
  adjusted: DashboardAdjustmentMetrics;
  diff: DashboardAdjustmentMetrics;
}

export interface DashboardAdjustmentsData {
  summary?: DashboardAdjustmentSummary;
  categories?: DashboardAdjustmentCategorySummary[];
  districts?: DashboardAdjustmentDistrictSummary[];
  latestEntry?: NcdAdjustmentEntry;
}

export interface AlertRecord {
  id: string;
  alertType?: string;
  year?: number;
  month?: number;
  district?: string;
  subdistrict?: string;
  village?: string;
  message: string;
  status?: string;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface GetAlertsParams {
  status?: string;
  district?: string;
  subdistrict?: string;
  village?: string;
  alertType?: string;
  page?: number;
  limit?: number;
}

export interface AlertsListResponse {
  alerts: AlertRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  pendingCount?: number;
  updatedAt?: string;
}

export interface NcdMetrics {
  [category: string]: {
    normal: number;
    risk: number;
    sick: number;
  };
}

export interface RecordNcdAdjustmentPayload {
  id?: string;
  recordId?: string;
  targetGroup?: string;
  year: number;
  month: number;
  district: string;
  subdistrict: string;
  village: string;
  moo?: string;
  metrics: NcdMetrics;
  reason?: string;
}

export interface RecordNcdAdjustmentResponse {
  success: boolean;
  message: string;
  diff?: NcdMetrics;
  record?: NcdRecord;
}

export interface NcdAdjustmentEntry {
  id: string;
  recordId?: string;
  targetGroup?: string;
  year?: number;
  month?: number;
  district?: string;
  subdistrict?: string;
  village?: string;
  moo?: string;
  diff: NcdMetrics;
  baseline?: NcdMetrics;
  proposed?: NcdMetrics;
  reason?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface UpsertNcdPayload {
  id?: string;
  targetGroup?: string;
  year: number;
  month: number;
  district: string;
  subdistrict: string;
  village?: string;
  moo?: string;
  referCount?: number;
  metrics: NcdMetrics;
}

export interface NcdRecord extends UpsertNcdPayload {
  id: string;
  targetGroup: string;
  rowNumber?: number;
  periodKey?: string;
  periodLabel?: string;
  overviewTotal?: number;
  baselineMetrics?: NcdMetrics;
  adjustments?: NcdMetrics;
  adjustedMetrics?: NcdMetrics;
  baselineOverviewTotal?: number;
  adjustedOverviewTotal?: number;
  adjustmentEntries?: NcdAdjustmentEntry[];
  createdBy?: string;
  createdAt?: string | Date | null;
  updatedBy?: string;
  updatedAt?: string | Date | null;
}

export interface GetNcdRecordsParams {
  targetGroup?: string;
  year?: number;
  month?: number;
  district?: string;
  subdistrict?: string;
  village?: string;
  moo?: string;
  period?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NcdRecordsResponse {
  records: NcdRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UsersListResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  pendingCount: number;
  hasMore: boolean;
}

export interface GetUsersParams {
  role?: UserRole;
  status?: UserStatus;
  district?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserPayload {
  id?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  district?: string;
  name?: string;
  notes?: string;
}

export interface ChangeUserPasswordPayload {
  id?: string;
  username?: string;
  password: string;
  confirmPassword?: string;
  currentPassword?: string;
}

export interface ChangeUserPasswordResponse {
  success: boolean;
  message: string;
  username?: string;
}

export interface DistrictSubdistrictInfo {
  villages: string[];
  moos: string[];
}

export type DistrictsMapping = Record<
  string,
  Record<string, DistrictSubdistrictInfo>
>;

export interface InvalidateDistrictCacheResponse {
  success: boolean;
  message?: string;
  districts?: DistrictsMapping;
}

export interface DistrictEntry {
  id: string;
  districtCode: string;
  districtName: string;
  subdistrictCode: string;
  subdistrictName: string;
  villageName: string;
  moo: string;
  population: number | null;
}

export interface DistrictEntriesResponse {
  entries: DistrictEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetDistrictEntriesParams {
  district?: string;
  subdistrict?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SaveDistrictEntryPayload {
  id?: string;
  districtCode?: string;
  districtName: string;
  subdistrictCode?: string;
  subdistrictName: string;
  villageName?: string;
  moo?: string;
  population?: number | null;
}

export interface SyncedLocationSummary {
  generalUpdated: number;
  monkUpdated: number;
  totalUpdated: number;
  updatedRecordIds?: {
    general: string[];
    monk: string[];
  };
}

export interface SaveDistrictEntryResult {
  success: boolean;
  message: string;
  entry?: DistrictEntry;
  districts?: DistrictsMapping;
  syncedRecords?: SyncedLocationSummary;
}

export interface DeleteDistrictEntryResult {
  success: boolean;
  message: string;
  districts?: DistrictsMapping;
}

interface FetchOptions {
  withAuth?: boolean;
  tokenOverride?: string | null;
  signal?: AbortSignal;
}

class GoogleSheetsApiService {
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token ?? null;
  }

  private clearStoredAuthArtifacts() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
      window.localStorage.removeItem("session");
    } catch (error) {
      console.error("Failed to clear stored auth artifacts:", error);
    }
  }

  private dispatchAuthInvalidatedEvent() {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    try {
      if (typeof CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT));
        return;
      }

      if (typeof document !== "undefined" && typeof document.createEvent === "function") {
        const fallbackEvent = document.createEvent("Event");
        fallbackEvent.initEvent(AUTH_INVALIDATED_EVENT, false, false);
        window.dispatchEvent(fallbackEvent);
      }
    } catch (error) {
      console.error("Failed to dispatch auth invalidated event:", error);
    }
  }

  private normalizeSessionInfo(
    session: Partial<SessionInfo> | null | undefined
  ): SessionInfo | null {
    if (!session || typeof session !== "object") {
      return null;
    }

    const toIsoString = (value: unknown): string | null => {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        try {
          return new Date(value).toISOString();
        } catch (error) {
          console.error("Failed to convert session timestamp to ISO string:", error);
        }
      }
      return null;
    };

    const createdAt = toIsoString(session.createdAt);
    const lastAccess = toIsoString(session.lastAccess);
    const idleExpiresAt = toIsoString(session.idleExpiresAt);
    const expiresAt = toIsoString(session.expiresAt);

    if (!createdAt || !lastAccess || !idleExpiresAt || !expiresAt) {
      return null;
    }

    const sessionTimeout = Number(session.sessionTimeout);
    const maxSessionDuration = Number(session.maxSessionDuration);

    return {
      createdAt,
      lastAccess,
      idleExpiresAt,
      expiresAt,
      sessionTimeout: Number.isFinite(sessionTimeout) && sessionTimeout > 0 ? sessionTimeout : 0,
      maxSessionDuration:
        Number.isFinite(maxSessionDuration) && maxSessionDuration > 0 ? maxSessionDuration : 0,
    };
  }

  private resolveAuthToken(tokenOverride?: string | null): string | null {
    if (typeof tokenOverride === "string") {
      return tokenOverride;
    }

    if (this.authToken) {
      return this.authToken;
    }

    if (typeof window !== "undefined") {
      const storedToken = window.localStorage.getItem("token");
      if (storedToken) {
        this.authToken = storedToken;
        return storedToken;
      }
    }

    return null;
  }

  private async fetchData<TResponse>(
    action: string,
    params: Record<string, unknown> = {},
    options: FetchOptions = {}
  ): Promise<TResponse> {
    const { withAuth = true, tokenOverride = null, signal } = options;
    const formData = new URLSearchParams();
    formData.append("action", action);

    if (withAuth) {
      const token = this.resolveAuthToken(tokenOverride);
      if (token) {
        formData.append("token", token);
      }
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || key === "action" || key === "token") {
        return;
      }

      const serialized =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      formData.append(key, serialized);
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as TResponse;
    } catch (error) {
      console.error("Failed to parse API response:", text);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const result = await this.fetchData<{
        success: boolean;
        token?: string;
        user?: User;
        session?: Partial<SessionInfo> | null;
        message?: string;
      }>("login", { username, password }, { withAuth: false });

      if (result.success && result.user && result.token) {
        this.setAuthToken(result.token);
        return {
          success: true,
          user: result.user,
          token: result.token,
          session: this.normalizeSessionInfo(result.session),
        };
      }

      this.setAuthToken(null);
      return {
        success: false,
        user: result.user,
        message: result.message,
      };
    } catch (error) {
      console.error("Login error:", error);
      this.setAuthToken(null);
      return {
        success: false,
        message: "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ",
      };
    }
  }

  async getSessionStatus(): Promise<{ user: User; session: SessionInfo }> {
    try {
      const result = await this.fetchData<{
        success: boolean;
        user?: User;
        session?: Partial<SessionInfo> | null;
        message?: string;
      }>("getSessionStatus");

      if (!result.success || !result.user || !result.session) {
        this.handleAuthorizationFailure(result.message);
        throw new Error(result.message || "ไม่สามารถตรวจสอบสถานะเซสชันได้");
      }

      const session = this.normalizeSessionInfo(result.session);
      if (!session) {
        throw new Error("ไม่สามารถอ่านข้อมูลเซสชันได้");
      }

      return {
        user: result.user,
        session,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.handleAuthorizationFailure(error.message);
      }
      console.error("getSessionStatus error:", error);
      throw error;
    }
  }

  async logout(): Promise<boolean> {
    try {
      const token = this.resolveAuthToken();
      if (!token) {
        return true;
      }

      const result = await this.fetchData<{ success: boolean }>(
        "logout",
        {},
        { withAuth: true }
      );
      return !!result.success;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    } finally {
      this.setAuthToken(null);
      this.clearStoredAuthArtifacts();
      this.dispatchAuthInvalidatedEvent();
    }
  }

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    try {
      const result = await this.fetchData<RegisterResponse>(
        "register",
        payload,
        { withAuth: false }
      );
      return result;
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, message: "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเนเธ”เน" };
    }
  }

  private handleAuthorizationFailure(message?: string) {
    const normalized = (message || "").toLowerCase();
    if (!normalized) {
      return;
    }

    if (
      normalized.includes("unauthorized") ||
      normalized.includes("session") ||
      (message && message.includes("เซสชัน"))
    ) {
      this.setAuthToken(null);
      this.clearStoredAuthArtifacts();
      this.dispatchAuthInvalidatedEvent();
    }
  }

  private cleanStringList(values: unknown[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => {
            if (value === null || value === undefined) {
              return "";
            }
            return String(value).trim();
          })
          .filter((value): value is string => value.length > 0)
      )
    );
  }

  private normalizeDistrictMapping(raw: unknown): DistrictsMapping {
    const normalized: DistrictsMapping = {};
    if (!raw || typeof raw !== "object") {
      return normalized;
    }

    Object.entries(raw as Record<string, unknown>).forEach(
      ([districtName, subdistricts]) => {
        if (!subdistricts || typeof subdistricts !== "object") {
          return;
        }

        const normalizedSubdistricts: Record<
          string,
          DistrictSubdistrictInfo
        > = {};

        Object.entries(subdistricts as Record<string, unknown>).forEach(
          ([subdistrictName, entry]) => {
            if (Array.isArray(entry)) {
              normalizedSubdistricts[subdistrictName] = {
                villages: this.cleanStringList(entry),
                moos: [],
              };
              return;
            }

            if (entry && typeof entry === "object") {
              const entryObject = entry as Record<string, unknown>;
              const villages = Array.isArray(entryObject.villages)
                ? entryObject.villages
                : [];
              const moos = Array.isArray(entryObject.moos)
                ? entryObject.moos
                : [];

              normalizedSubdistricts[subdistrictName] = {
                villages: this.cleanStringList(villages),
                moos: this.cleanStringList(moos),
              };
              return;
            }

            normalizedSubdistricts[subdistrictName] = {
              villages: [],
              moos: [],
            };
          }
        );

        if (Object.keys(normalizedSubdistricts).length > 0) {
          normalized[districtName] = normalizedSubdistricts;
        }
      }
    );

    return normalized;
  }

  async getDashboardData(
    filters: Record<string, unknown> = {},
    options: { signal?: AbortSignal } = {}
  ): Promise<DashboardData> {
    const result = await this.fetchData<{
      success: boolean;
      data?: DashboardData;
      message?: string;
    }>("getDashboardData", filters, { withAuth: false, signal: options.signal });

    if (!result.success || !result.data) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธ เธฒเธเธฃเธงเธกเนเธ”เน");
    }

    return result.data;
  }

  async getDashboardDetail(
    params: DashboardDetailParams,
    options: { signal?: AbortSignal } = {}
  ): Promise<DashboardDetailData> {
    const result = await this.fetchData<{
      success: boolean;
      data?: DashboardDetailData;
      message?: string;
    }>("getDashboardDetail", params, { withAuth: false, signal: options.signal });

    if (!result.success || !result.data) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธถเธเธเนเธญเธกเธนเธฅเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เนเธ”เน");
    }

    return result.data;
  }

  async getAlerts(
    params: GetAlertsParams = {},
    options: { signal?: AbortSignal } = {}
  ): Promise<AlertsListResponse> {
    const result = await this.fetchData<{
      success: boolean;
      data?: AlertsListResponse;
      message?: string;
    }>("getAlerts", params, { signal: options.signal });

    if (!result.success || !result.data) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธเธฒเธฃเนเธเนเธเน€เธ•เธทเธญเธเนเธ”เน");
    }

    return result.data;
  }

  async getDistricts(): Promise<DistrictsMapping> {
    const result = await this.fetchData<{
      success: boolean;
      districts: unknown;
    }>("getDistricts", {}, { withAuth: false });

    if (!result.success || !result.districts) {
      return {};
    }

    return this.normalizeDistrictMapping(result.districts);
  }

  async invalidateDistrictCache(): Promise<InvalidateDistrictCacheResponse> {
    const result = await this.fetchData<InvalidateDistrictCacheResponse>(
      "invalidateDistrictCache"
    );

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธฃเธตเน€เธเธฃเธเธเนเธญเธกเธนเธฅเธเธทเนเธเธ—เธตเนเนเธ”เน");
    }

    const normalizedDistricts = result.districts
      ? this.normalizeDistrictMapping(result.districts)
      : undefined;

    return {
      success: true,
      message: result.message || "เธฃเธตเน€เธเธฃเธเธเนเธญเธกเธนเธฅเธเธทเนเธเธ—เธตเนเน€เธฃเธตเธขเธเธฃเนเธญเธข",
      districts: normalizedDistricts,
    };
  }

  async getDistrictEntries(
    params: GetDistrictEntriesParams = {}
  ): Promise<DistrictEntriesResponse> {
    const result = await this.fetchData<{
      success: boolean;
      data?: DistrictEntriesResponse;
      message?: string;
    }>("getDistrictEntries", params);

    if (!result.success || !result.data) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "ไม่สามารถดึงข้อมูลพื้นที่ได้");
    }

    return result.data;
  }

  async saveDistrictEntry(
    payload: SaveDistrictEntryPayload
  ): Promise<SaveDistrictEntryResult> {
    const result = await this.fetchData<{
      success: boolean;
      message?: string;
      entry?: DistrictEntry;
      districts?: unknown;
      syncedRecords?: {
        generalUpdated?: number;
        monkUpdated?: number;
        totalUpdated?: number;
        updatedRecordIds?: {
          general?: unknown[];
          monk?: unknown[];
        };
      };
    }>("saveDistrictEntry", payload);

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "ไม่สามารถบันทึกข้อมูลพื้นที่ได้");
    }

    let normalizedDistricts: DistrictsMapping | undefined;
    if (result.districts) {
      normalizedDistricts = this.normalizeDistrictMapping(result.districts);
    }

    let normalizedSyncedRecords: SyncedLocationSummary | undefined;
    if (result.syncedRecords) {
      const generalIdsRaw = result.syncedRecords.updatedRecordIds?.general;
      const monkIdsRaw = result.syncedRecords.updatedRecordIds?.monk;
      const hasGeneralIds = Array.isArray(generalIdsRaw) && generalIdsRaw.length > 0;
      const hasMonkIds = Array.isArray(monkIdsRaw) && monkIdsRaw.length > 0;
      const generalIds = hasGeneralIds
        ? generalIdsRaw.map((value) => String(value))
        : undefined;
      const monkIds = hasMonkIds ? monkIdsRaw.map((value) => String(value)) : undefined;

      normalizedSyncedRecords = {
        generalUpdated: Number(result.syncedRecords.generalUpdated ?? 0),
        monkUpdated: Number(result.syncedRecords.monkUpdated ?? 0),
        totalUpdated: Number(result.syncedRecords.totalUpdated ?? 0),
        updatedRecordIds:
          generalIds || monkIds
            ? {
                general: generalIds ?? [],
                monk: monkIds ?? [],
              }
            : undefined,
      };
    }

    return {
      success: true,
      message: result.message || "บันทึกข้อมูลพื้นที่เรียบร้อย",
      entry: result.entry,
      districts: normalizedDistricts,
      syncedRecords: normalizedSyncedRecords,
    };
  }

  async deleteDistrictEntry(id: string): Promise<DeleteDistrictEntryResult> {
    const result = await this.fetchData<{
      success: boolean;
      message?: string;
      districts?: unknown;
    }>("deleteDistrictEntry", { id });

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "ไม่สามารถลบข้อมูลพื้นที่ได้");
    }

    let normalizedDistricts: DistrictsMapping | undefined;
    if (result.districts) {
      normalizedDistricts = this.normalizeDistrictMapping(result.districts);
    }

    return {
      success: true,
      message: result.message || "ลบข้อมูลพื้นที่เรียบร้อย",
      districts: normalizedDistricts,
    };
  }

  async getNcdRecords(
    params: GetNcdRecordsParams = {},
    options: { signal?: AbortSignal } = {}
  ): Promise<NcdRecordsResponse> {
    const result = await this.fetchData<{
      success: boolean;
      data?: NcdRecordsResponse;
      message?: string;
    }>("getNcdRecords", params, { withAuth: false, signal: options.signal });

    if (!result.success || !result.data) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธถเธเธเนเธญเธกเธนเธฅ NCD เนเธ”เน");
    }

    return result.data;
  }

  async saveNcdRecord(payload: UpsertNcdPayload): Promise<{
    success: boolean;
    message: string;
    id?: string;
  }> {
    const result = await this.fetchData<{
      success: boolean;
      message?: string;
      id?: string;
    }>("saveNcdData", payload);

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเนเธ”เน");
    }

    return {
      success: true,
      message: result.message || "เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธชเธณเน€เธฃเนเธ",
      id: result.id,
    };
  }

  async deleteNcdRecord(
    id: string,
    targetGroup?: string
  ): Promise<boolean> {
    const result = await this.fetchData<{
      success: boolean;
      message?: string;
    }>("deleteNcdData", { id, targetGroup });

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธฅเธเธเนเธญเธกเธนเธฅเนเธ”เน");
    }

    return true;
  }

  async recordNcdAdjustment(
    payload: RecordNcdAdjustmentPayload
  ): Promise<RecordNcdAdjustmentResponse> {
    const result = await this.fetchData<RecordNcdAdjustmentResponse & {
      success: boolean;
      message?: string;
      record?: NcdRecord;
      diff?: NcdMetrics;
    }>("recordNcdAdjustment", payload);

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "ไม่สามารถปรับยอดได้");
    }

    return {
      success: true,
      message: result.message || "บันทึกการปรับยอดเรียบร้อย",
      diff: result.diff,
      record: result.record,
    };
  }

  async getUsers(params: GetUsersParams = {}): Promise<UsersListResponse> {
    const result = await this.fetchData<{
      success: boolean;
      data?: UsersListResponse;
      message?: string;
    }>("getUsers", params);

    if (!result.success || !result.data) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธถเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเนเธ”เน");
    }

    return result.data;
  }

  async updateUser(
    payload: UpdateUserPayload
  ): Promise<{ success: boolean; message: string; user?: ManagedUser }> {
    const result = await this.fetchData<{
      success: boolean;
      message?: string;
      user?: ManagedUser;
    }>("updateUser", payload);

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเธฑเธเน€เธ”เธ•เธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเนเธ”เน");
    }

    return {
      success: true,
      message: result.message || "เธญเธฑเธเน€เธ”เธ•เธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเน€เธฃเธตเธขเธเธฃเนเธญเธข",
      user: result.user,
    };
  }

  async approveUser(
    payload: UpdateUserPayload
  ): Promise<{ success: boolean; message: string; user?: ManagedUser }> {
    const result = await this.fetchData<{
      success: boolean;
      message?: string;
      user?: ManagedUser;
    }>("approveUser", payload);

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(result.message || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเธเธธเธกเธฑเธ•เธดเธเธนเนเนเธเนเนเธ”เน");
    }

    return {
      success: true,
      message: result.message || "เธญเธเธธเธกเธฑเธ•เธดเธเธนเนเนเธเนเน€เธฃเธตเธขเธเธฃเนเธญเธข",
      user: result.user,
    };
  }

  async changeUserPassword(
    payload: ChangeUserPasswordPayload
  ): Promise<ChangeUserPasswordResponse> {
    const result = await this.fetchData<ChangeUserPasswordResponse>(
      "changeUserPassword",
      payload
    );

    if (!result.success) {
      this.handleAuthorizationFailure(result.message);
      throw new Error(
        result.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้"
      );
    }

    return result;
  }
}

export const googleSheetsApi = new GoogleSheetsApiService();
