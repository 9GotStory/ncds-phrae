import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  ActivitySquare,
  BadgeCheck,
  Check,
  Clock3,
  Eye,
  FileSpreadsheet,
  Info,
  KeyRound,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserCircle2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Navigation } from "@/components/Navigation";
import { LoadingState } from "@/components/LoadingState";
import DistrictManager from "@/components/DistrictManager";
import { getCombinedQueryState } from "@/lib/queryState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/useAuth";
import {
  googleSheetsApi,
  type DistrictsMapping,
  type ManagedUser,
  type NcdMetrics,
  type NcdRecord,
  type UsersListResponse,
  type UserRole,
  type UserStatus,
  type UpdateUserPayload,
} from "@/services/googleSheetsApi";

const metricSchema = z.object({
  normal: z.coerce.number().min(0, "ต้องเป็นตัวเลขที่ไม่ติดลบ"),
  risk: z.coerce.number().min(0, "ต้องเป็นตัวเลขที่ไม่ติดลบ"),
  sick: z.coerce.number().min(0, "ต้องเป็นตัวเลขที่ไม่ติดลบ"),
});

const metricsSchema = z.object({
  Overview: metricSchema,
  Obesity: metricSchema,
  Diabetes: metricSchema,
  Hypertension: metricSchema,
  Mental: metricSchema,
  Alcohol: metricSchema,
  Smoking: metricSchema,
});

const METRIC_CATEGORY_VALUES = [
  "Overview",
  "Obesity",
  "Diabetes",
  "Hypertension",
  "Mental",
  "Alcohol",
  "Smoking",
] as const;

const METRIC_STATUS_VALUES = ["normal", "risk", "sick"] as const;





const ncdFormSchema = z.object({
  id: z.string().optional(),
  targetGroup: z.enum(["general", "monk"]),
  year: z.coerce
    .number({ required_error: "กรุณาระบุปี" })
    .min(2400, "ปีไม่ถูกต้อง")
    .max(2700, "ปีไม่ถูกต้อง"),
  month: z.coerce
    .number({ required_error: "กรุณาเลือกเดือน" })
    .min(1, "เดือนต้องอยู่ระหว่าง 1-12")
    .max(12, "เดือนต้องอยู่ระหว่าง 1-12"),
  district: z.string().min(1, "กรุณาเลือกอำเภอ"),
  subdistrict: z.string().min(1, "กรุณาเลือกตำบล"),
  village: z.string().min(1, "กรุณาระบุหมู่บ้าน"),
  moo: z.string().min(1, "กรุณาเลือกหมู่ที่"),
  referCount: z.coerce.number().min(0, "ต้องเป็นตัวเลขที่ไม่ติดลบ").default(0),
  metrics: metricsSchema,
});

type NcdFormValues = z.infer<typeof ncdFormSchema>;



const currentThaiYear = new Date().getFullYear() + 543;
const currentMonth = new Date().getMonth() + 1;

const emptyMetrics: NcdFormValues["metrics"] = {
  Overview: { normal: 0, risk: 0, sick: 0 },
  Obesity: { normal: 0, risk: 0, sick: 0 },
  Diabetes: { normal: 0, risk: 0, sick: 0 },
  Hypertension: { normal: 0, risk: 0, sick: 0 },
  Mental: { normal: 0, risk: 0, sick: 0 },
  Alcohol: { normal: 0, risk: 0, sick: 0 },
  Smoking: { normal: 0, risk: 0, sick: 0 },
};

type MetricCategoryKey = keyof NcdFormValues["metrics"];
type MetricFieldKey = keyof NcdFormValues["metrics"]["Overview"];

type MetricStepConfig = {
  type: "metric";
  key: MetricCategoryKey;
  title: string;
  description: string;
};

type ReferralStepConfig = {
  type: "referral";
  key: "Referral";
  title: string;
  description: string;
};

type FormStepConfig = MetricStepConfig | ReferralStepConfig;

const FORM_STEP_CONFIGS: FormStepConfig[] = [
  {
    type: "metric",
    key: "Overview",
    title: "ภาพรวม NCDs",
    description:
      "กรอกจำนวนประชากรทั้งหมดตามกลุ่มอาการ เพื่อใช้เป็นฐานเปรียบเทียบในโรคอื่น",
  },
  {
    type: "metric",
    key: "Obesity",
    title: "โรคอ้วน",
    description: "ระบุจำนวนผู้ที่อยู่ในกลุ่มโรคอ้วนตามระดับภาวะ",
  },
  {
    type: "metric",
    key: "Diabetes",
    title: "เบาหวาน",
    description: "กรอกจำนวนผู้ที่มีความเสี่ยงหรือเป็นโรคเบาหวาน",
  },
  {
    type: "metric",
    key: "Hypertension",
    title: "ความดันโลหิต",
    description: "บันทึกจำนวนผู้ที่อยู่ในกลุ่มเสี่ยงหรือมีภาวะความดันโลหิตสูง",
  },
  {
    type: "metric",
    key: "Mental",
    title: "สุขภาพจิต",
    description: "กรอกจำนวนผู้ที่อยู่ในกลุ่มเสี่ยงหรือมีปัญหาสุขภาพจิต",
  },
  {
    type: "metric",
    key: "Alcohol",
    title: "แอลกอฮอล์",
    description: "ระบุจำนวนผู้ที่มีภาวะเสี่ยงจากการดื่มเครื่องดื่มแอลกอฮอล์",
  },
  {
    type: "metric",
    key: "Smoking",
    title: "สูบบุหรี่",
    description: "บันทึกจำนวนผู้ที่มีพฤติกรรมสูบบุหรี่",
  },
  {
    type: "referral",
    key: "Referral",
    title: "การส่งต่อหน่วยบริการ",
    description:
      "แจ้งว่ามีการส่งต่อผู้ป่วยไปยังหน่วยบริการหรือไม่ หากมีให้ระบุจำนวน",
  },
];

const metricStepConfigs = FORM_STEP_CONFIGS.filter(
  (step): step is MetricStepConfig => step.type === "metric"
);

const metricStepKeys = metricStepConfigs.map((step) => step.key);
const metricStepKeysWithoutOverview = metricStepKeys.filter(
  (key) => key !== "Overview"
);

const METRIC_FIELDS: Array<{
  key: MetricFieldKey;
  label: string;
  accent: string;
}> = [
  { key: "normal", label: "ปกติ", accent: "text-success" },
  { key: "risk", label: "เสี่ยง", accent: "text-warning" },
  { key: "sick", label: "ป่วย", accent: "text-destructive" },
];

const monthOptions = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const targetGroupLabels: Record<string, string> = {
  general: "บุคคลทั่วไป",
  monk: "พระสงฆ์",
};

const userRoleLabels: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  officer: "เจ้าหน้าที่",
  viewer: "ผู้ชมข้อมูล",
};

const userStatusLabels: Record<string, string> = {
  active: "ใช้งาน",
  inactive: "ระงับ",
  pending: "รออนุมัติ",
};

const roleOptions = [
  { value: "admin", label: userRoleLabels.admin },
  { value: "officer", label: userRoleLabels.officer },
  { value: "viewer", label: userRoleLabels.viewer },
];

const statusOptions = [
  { value: "active", label: userStatusLabels.active },
  { value: "inactive", label: userStatusLabels.inactive },
  { value: "pending", label: userStatusLabels.pending },
];

const ALL_ROLE_VALUE = "__all_role__";
const ALL_STATUS_VALUE = "__all_status__";
const NCD_PAGE_SIZE = 10;
const USER_PAGE_SIZE = 50;
const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE =
  "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว และมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และสัญลักษณ์";

interface AdminPageProps {
  allowUserManagement?: boolean;
  pageTitle?: string;
  pageDescription?: string;
  loadingMessage?: string;
  layoutVariant?: "admin" | "officer";
}

const Admin = ({
  allowUserManagement = true,
  pageTitle = "ระบบจัดการข้อมูลสำหรับผู้ดูแล",
  pageDescription = "บันทึกข้อมูล NCD และจัดการสิทธิ์ผู้ใช้งานในระบบ",
  loadingMessage = "กำลังโหลดข้อมูลสำหรับผู้ดูแลระบบ...",
  layoutVariant,
}: AdminPageProps) => {
  const resolvedLayout: "admin" | "officer" =
    layoutVariant ?? (allowUserManagement ? "admin" : "officer");

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isOfficer = user?.role === "officer";
  const canManageUsers = allowUserManagement && (isAdmin || isOfficer);
  const canEditUserRole = isAdmin;
  const canEditUserStatus = isAdmin;
  const canApproveUsers = isAdmin;

  const [editingRecord, setEditingRecord] = useState<NcdRecord | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<{
    status: "idle" | "not-found" | "error" | "found";
    message?: string;
  }>({ status: "idle" });
  const [formUnlocked, setFormUnlocked] = useState(false);
  const [userFilters, setUserFilters] = useState<{
    role: string;
    status: string;
    search: string;
  }>({ role: "", status: "", search: "" });
  const [usersPage, setUsersPage] = useState(1);
  const [userNameDrafts, setUserNameDrafts] = useState<Record<string, string>>(
    {}
  );
  const [passwordDialogAccount, setPasswordDialogAccount] =
    useState<ManagedUser | null>(null);
  const [passwordForm, setPasswordForm] = useState<{
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
  }>({ newPassword: "", confirmPassword: "", currentPassword: "" });
  const isPasswordDialogOpen = Boolean(passwordDialogAccount);
  const resetPasswordForm = useCallback(() => {
    setPasswordForm({ newPassword: "", confirmPassword: "", currentPassword: "" });
  }, []);
  const closePasswordDialog = useCallback(() => {
    setPasswordDialogAccount(null);
    resetPasswordForm();
  }, [resetPasswordForm]);

  const districtMappingQuery = useQuery({
    queryKey: ["district-mapping"],
    queryFn: () => googleSheetsApi.getDistricts(),
  });
  const invalidateDistrictCacheMutation = useMutation({
    mutationFn: () => googleSheetsApi.invalidateDistrictCache(),
    onSuccess: (result) => {
      toast.success(result.message ?? "รีเฟรชข้อมูลพื้นที่เรียบร้อย");
      if (result.districts) {
        queryClient.setQueryData(["district-mapping"], result.districts);
      } else {
        queryClient.invalidateQueries({ queryKey: ["district-mapping"] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<NcdFormValues>({
    resolver: zodResolver(ncdFormSchema),
    defaultValues: {
      id: undefined,
      targetGroup: "general",
      year: currentThaiYear,
      month: currentMonth,
      district: "",
      subdistrict: "",
      village: "",
      moo: "",
      referCount: 0,
      metrics: emptyMetrics,
    },
  });

  const [hasReferral, setHasReferral] = useState(
    () => Number(form.getValues("referCount") ?? 0) > 0
  );



  const buildLocationParts = (
    district?: string,
    subdistrict?: string,
    village?: string,
    moo?: string | null
  ) => {
    const parts: string[] = [];
    if (district) {
      parts.push(district);
    }
    if (subdistrict) {
      parts.push(subdistrict);
    }
    if (village) {
      parts.push(village);
    }
    if (moo) {
      parts.push(`หมู่ที่ ${moo}`);
    }
    return parts;
  };

  const normalizeForCompare = useCallback((value: unknown) => {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim().toLowerCase();
  }, []);

  const resetFormForNewEntry = useCallback(
    (
      overrides: Partial<NcdFormValues> = {},
      options?: { unlock?: boolean }
    ) => {
      const currentValues = form.getValues();
      const resolvedReferCount = overrides.referCount ?? 0;
      form.reset({
        id: undefined,
        targetGroup: (overrides.targetGroup ??
          currentValues.targetGroup ??
          "general") as "general" | "monk",
        year: overrides.year ?? currentValues.year ?? currentThaiYear,
        month: overrides.month ?? currentValues.month ?? currentMonth,
        district: overrides.district ?? currentValues.district ?? "",
        subdistrict: overrides.subdistrict ?? currentValues.subdistrict ?? "",
        village: overrides.village ?? currentValues.village ?? "",
        moo: overrides.moo ?? currentValues.moo ?? "",
        referCount: resolvedReferCount,
        metrics: overrides.metrics ?? emptyMetrics,
      });
      setHasReferral(resolvedReferCount > 0);
      if (options?.unlock !== undefined) {
        setFormUnlocked(options.unlock);
      }
    },
    [form, setFormUnlocked, setHasReferral]
  );

  const targetGroupValue = form.watch("targetGroup");
  const districtValue = form.watch("district");
  const subdistrictValue = form.watch("subdistrict");
  const yearValue = form.watch("year");
  const monthValue = form.watch("month");
  const villageValue = form.watch("village");
  const mooValue = form.watch("moo");
  const metricsValues = form.watch("metrics");
  const referCountValue = form.watch("referCount");
  const showMetricsForm = formUnlocked || Boolean(editingRecord);

  const allFiltersFilled =
    Number.isFinite(yearValue) &&
    Number.isFinite(monthValue) &&
    Boolean(
      targetGroupValue &&
        districtValue &&
        subdistrictValue &&
        villageValue &&
        mooValue
    );


  const currentLocationLabel = useMemo(() => {
    const parts = buildLocationParts(
      districtValue,
      subdistrictValue,
      villageValue,
      mooValue
    );
    return parts.length > 0 ? parts.join(" · ") : "พื้นที่ที่เลือก";
  }, [districtValue, subdistrictValue, villageValue, mooValue]);

  const currentPeriodLabel = useMemo(() => {
    const numericMonth = Number(monthValue) || "";
    const numericYear = Number(yearValue) || "";
    if (!numericMonth || !numericYear) {
      return "-";
    }
    return `${numericMonth}/${numericYear}`;
  }, [monthValue, yearValue]);

  const [metricsStepIndex, setMetricsStepIndex] = useState(0);
  const referCountNumber = Number.isFinite(referCountValue)
    ? Number(referCountValue)
    : 0;
  const referralNeedsAttention = hasReferral && referCountNumber <= 0;

  const overviewMetrics = metricsValues?.Overview ?? emptyMetrics.Overview;
  const overviewTotal =
    (overviewMetrics?.normal ?? 0) +
    (overviewMetrics?.risk ?? 0) +
    (overviewMetrics?.sick ?? 0);

  const totalStepCount = FORM_STEP_CONFIGS.length;
  const currentStep =
    FORM_STEP_CONFIGS[metricsStepIndex] ?? FORM_STEP_CONFIGS[0];
  const isMetricStep = currentStep.type === "metric";
  const currentMetricKey = isMetricStep ? currentStep.key : null;
  const currentMetricValues = currentMetricKey
    ? metricsValues?.[currentMetricKey] ?? emptyMetrics[currentMetricKey]
    : null;

  const calculateCategoryTotal = useCallback(
    (categoryKey: MetricCategoryKey) => {
      const category = metricsValues?.[categoryKey];
      if (!category) return 0;
      return (
        (category.normal ?? 0) + (category.risk ?? 0) + (category.sick ?? 0)
      );
    },
    [metricsValues]
  );

  const currentCategoryTotal = currentMetricKey
    ? calculateCategoryTotal(currentMetricKey)
    : 0;
  const remainingForCategory = currentMetricKey
    ? Math.max(0, overviewTotal - currentCategoryTotal)
    : 0;

  const isFirstMetricStep = metricsStepIndex === 0;
  const isLastStep = metricsStepIndex === Math.max(0, totalStepCount - 1);

  const goToPreviousMetricStep = useCallback(() => {
    setMetricsStepIndex((previous) => Math.max(0, previous - 1));
  }, []);

  const goToNextMetricStep = useCallback(() => {
    if (isMetricStep && currentMetricKey) {
      if (currentMetricKey === "Overview" && overviewTotal <= 0) {
        toast.warning("กรุณากรอกจำนวนภาพรวมก่อนดำเนินการต่อ");
        return;
      }
      if (currentMetricKey !== "Overview") {
        if (overviewTotal <= 0) {
          toast.warning("กรุณากรอกข้อมูลภาพรวมให้ครบก่อนดำเนินการต่อ");
          return;
        }
        if (remainingForCategory > 0) {
          toast.warning(
            `ยังขาดอีก ${remainingForCategory.toLocaleString()} คนในหมวดนี้`
          );
          return;
        }
      }
    }
    setMetricsStepIndex((previous) =>
      Math.min(previous + 1, Math.max(0, totalStepCount - 1))
    );
  }, [
    currentMetricKey,
    isMetricStep,
    overviewTotal,
    remainingForCategory,
    totalStepCount,
  ]);

  const normalizeMetricValue = useCallback((value: unknown) => {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return Math.floor(numericValue);
    }
    return 0;
  }, []);

  const clampMetricValue = useCallback(
    (
      categoryKey: MetricCategoryKey,
      fieldKey: MetricFieldKey,
      proposedValue: number
    ) => {
      const sanitizedValue = Math.max(
        0,
        Math.floor(Number(proposedValue) || 0)
      );
      if (categoryKey === "Overview") {
        return sanitizedValue;
      }
      const total = Math.max(0, overviewTotal);
      if (total === 0) {
        return 0;
      }
      const category = form.getValues(`metrics.${categoryKey}`);
      if (!category) {
        return Math.min(sanitizedValue, total);
      }
      const currentFieldValue = Math.max(
        0,
        Math.floor(Number(category[fieldKey] ?? 0) || 0)
      );
      const currentTotal =
        Math.max(0, Math.floor(Number(category.normal ?? 0) || 0)) +
        Math.max(0, Math.floor(Number(category.risk ?? 0) || 0)) +
        Math.max(0, Math.floor(Number(category.sick ?? 0) || 0));
      const otherFieldsTotal = Math.max(0, currentTotal - currentFieldValue);
      const allowedMax = Math.max(0, total - otherFieldsTotal);
      return Math.min(sanitizedValue, allowedMax);
    },
    [form, overviewTotal]
  );

  useEffect(() => {
    if (!showMetricsForm) {
      setHasReferral(false);
      return;
    }
    const current = Number(form.getValues("referCount") ?? 0);
    setHasReferral(current > 0);
  }, [editingRecord?.id, form, showMetricsForm]);

  useEffect(() => {
    if (showMetricsForm) {
      setMetricsStepIndex(0);
    }
  }, [showMetricsForm, editingRecord?.id]);

  useEffect(() => {
    if (!showMetricsForm) {
      return;
    }
    const total = Math.max(0, overviewTotal);
    metricStepKeysWithoutOverview.forEach((key) => {
      const category = form.getValues(`metrics.${key}`);
      if (!category) {
        return;
      }
      METRIC_FIELDS.forEach(({ key: fieldKey }) => {
        const currentValue = Math.max(
          0,
          Math.floor(Number(category[fieldKey] ?? 0) || 0)
        );
        const boundedValue = clampMetricValue(key, fieldKey, currentValue);
        if (boundedValue !== currentValue) {
          form.setValue(`metrics.${key}.${fieldKey}`, boundedValue, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
      });
    });
  }, [clampMetricValue, form, overviewTotal, showMetricsForm]);

  const currentNormalDisplay = normalizeMetricValue(
    currentMetricValues?.normal
  );
  const currentRiskDisplay = normalizeMetricValue(currentMetricValues?.risk);
  const currentSickDisplay = normalizeMetricValue(currentMetricValues?.sick);
  const showOverviewWarning =
    isMetricStep && currentMetricKey === "Overview" && overviewTotal <= 0;
  const showRemainingWarning =
    isMetricStep &&
    currentMetricKey !== null &&
    currentMetricKey !== "Overview" &&
    overviewTotal > 0 &&
    remainingForCategory > 0;
  const isNextDisabled =
    isMetricStep &&
    ((currentMetricKey === "Overview" && overviewTotal <= 0) ||
      (currentMetricKey !== null &&
        currentMetricKey !== "Overview" &&
        (overviewTotal <= 0 || remainingForCategory > 0)));

  const ncdRecordsQuery = useQuery({
    queryKey: [
      "ncd-records",
      targetGroupValue,
      user?.role === "officer" ? user?.district ?? "all" : "all",
    ],
    queryFn: () =>
      googleSheetsApi.getNcdRecords({
        targetGroup: targetGroupValue,
        page: 1,
        limit: NCD_PAGE_SIZE,
        ...(user?.role === "officer" ? { district: user.district } : {}),
      }),
    keepPreviousData: true,
  });

  const usersQuery = useQuery({
    queryKey: [
      "admin-users",
      userFilters.role,
      userFilters.status,
      userFilters.search,
      usersPage,
    ],
    queryFn: () =>
      googleSheetsApi.getUsers({
        role: (userFilters.role || undefined) as UserRole | undefined,
        status: (userFilters.status || undefined) as UserStatus | undefined,
        search: userFilters.search || undefined,
        page: usersPage,
        limit: USER_PAGE_SIZE,
        district: isOfficer ? user?.district ?? undefined : undefined,
      }),
    enabled: canManageUsers,
    keepPreviousData: true,
  });

  useEffect(() => {
    setUsersPage(1);
  }, [userFilters.role, userFilters.status, userFilters.search]);

  useEffect(() => {
    if (
      usersPage > 1 &&
      usersQuery.data &&
      usersQuery.data.users.length === 0 &&
      !usersQuery.isFetching
    ) {
      setUsersPage((previous) => Math.max(1, previous - 1));
    }
  }, [usersPage, usersQuery.data, usersQuery.isFetching]);

  const saveNcdMutation = useMutation({
    mutationFn: (values: NcdFormValues) =>
      googleSheetsApi.saveNcdRecord({
        id: values.id,
        targetGroup: values.targetGroup,
        year: values.year,
        month: values.month,
        district: values.district,
        subdistrict: values.subdistrict,
        village: values.village,
        moo: values.moo,
        referCount: values.referCount,
        metrics: values.metrics,
      }),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["ncd-records"] });
      setEditingRecord(null);
      setSearchFeedback({ status: "idle" });
      resetFormForNewEntry(
        {
          targetGroup: targetGroupValue,
          year: currentThaiYear,
          month: currentMonth,
          district: "",
          subdistrict: "",
          village: "",
          moo: "",
        },
        { unlock: false }
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const findNcdRecordMutation = useMutation({
    mutationFn: async (filters: {
      targetGroup: NcdFormValues["targetGroup"];
      year: number;
      month: number;
      district: string;
      subdistrict: string;
      village: string;
      moo: string;
    }) => {
      const response = await googleSheetsApi.getNcdRecords({
        targetGroup: filters.targetGroup,
        year: filters.year,
        month: filters.month,
        district: filters.district,
        subdistrict: filters.subdistrict,
        village: filters.village,
        moo: filters.moo,
        page: 1,
        limit: 1,
      });
      return response.records[0] ?? null;
    },
    onMutate: () => {
      setFormUnlocked(false);
      setSearchFeedback({ status: "idle" });
    },
    onSuccess: (record, variables) => {
      if (record) {
        toast.success("โหลดข้อมูลสำเร็จ");
        handleEditRecord(record);
        return;
      }
      setEditingRecord(null);
      resetFormForNewEntry(
        {
          targetGroup: variables.targetGroup,
          year: variables.year,
          month: variables.month,
          district: variables.district,
          subdistrict: variables.subdistrict,
          village: variables.village,
          moo: variables.moo,
        },
        { unlock: false }
      );
      const locationParts = buildLocationParts(
        variables.district,
        variables.subdistrict,
        variables.village,
        variables.moo
      );
      setSearchFeedback({
        status: "not-found",
        message: `ไม่พบข้อมูลสำหรับ ${
          locationParts.length > 0
            ? locationParts.join(" · ")
            : "พื้นที่ที่เลือก"
        } เดือน ${variables.month}/${
          variables.year
        } กรุณากด "สร้างใหม่" เพื่อเปิดฟอร์มบันทึกใหม่`,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setFormUnlocked(false);
      setSearchFeedback({
        status: "error",
        message: error.message,
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (payload: UpdateUserPayload & { id: string }) =>
      googleSheetsApi.updateUser(payload),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: (payload: { id: string }) =>
      googleSheetsApi.approveUser(payload),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      username: string;
      password: string;
      confirmPassword?: string;
      currentPassword?: string;
    }) => googleSheetsApi.changeUserPassword(payload),
    onSuccess: (result) => {
      toast.success(result.message ?? "เปลี่ยนรหัสผ่านสำเร็จ");
      closePasswordDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const districtMapping = useMemo(
    () => districtMappingQuery.data ?? ({} as DistrictsMapping),
    [districtMappingQuery.data]
  );
  const officerDistrictMatch = useMemo(() => {
    if (user?.role !== "officer") {
      return "";
    }
    const target = (user.district ?? "").trim().toLowerCase();
    if (!target) {
      return "";
    }
    const availableDistricts = Object.keys(districtMapping);
    const matched = availableDistricts.find(
      (district) => district.trim().toLowerCase() === target
    );
    return matched ?? user.district ?? "";
  }, [districtMapping, user?.district, user?.role]);
  const districtNames = useMemo(() => {
    const names = Object.keys(districtMapping).sort();
    if (user?.role === "officer" && officerDistrictMatch) {
      return [officerDistrictMatch];
    }
    return names;
  }, [districtMapping, officerDistrictMatch, user?.role]);
  const subdistrictNames = useMemo(() => {
    if (!districtValue) {
      return [];
    }
    return Object.keys(districtMapping[districtValue] ?? {}).sort();
  }, [districtMapping, districtValue]);
  const villageNames = useMemo(() => {
    if (!districtValue || !subdistrictValue) {
      return [];
    }
    const villages =
      districtMapping[districtValue]?.[subdistrictValue]?.villages ?? [];
    return [...villages].sort((a, b) => a.localeCompare(b));
  }, [districtMapping, districtValue, subdistrictValue]);
  const mooNames = useMemo(() => {
    if (!districtValue || !subdistrictValue) {
      return [];
    }
    const moos = districtMapping[districtValue]?.[subdistrictValue]?.moos ?? [];
    if (!moos.length) {
      return [];
    }

    if (villageValue) {
      const normalizedVillage = villageValue.toLowerCase();
      const filtered = moos.filter((moo) =>
        normalizedVillage.includes(moo.toLowerCase())
      );
      if (filtered.length) {
        return [...filtered].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
      }
    }

    return [...moos].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [districtMapping, districtValue, subdistrictValue, villageValue]);

  useEffect(() => {
    if (!districtValue && districtNames.length === 1) {
      form.setValue("district", districtNames[0], {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [districtNames, districtValue, form]);

  useEffect(() => {
    if (!subdistrictValue && subdistrictNames.length === 1) {
      form.setValue("subdistrict", subdistrictNames[0], {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [form, subdistrictNames, subdistrictValue]);

  useEffect(() => {
    if (!villageValue && villageNames.length === 1) {
      form.setValue("village", villageNames[0], {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [form, villageNames, villageValue]);

  useEffect(() => {
    if (!mooValue && mooNames.length === 1) {
      form.setValue("moo", mooNames[0], {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [form, mooNames, mooValue]);

  const formatMooLabel = (value: string) =>
    /^\d+$/.test(value) ? `หมู่ที่ ${value}` : value;

  useEffect(() => {
    if (user?.role === "officer" && officerDistrictMatch) {
      const currentDistrict = form.getValues("district");
      if (currentDistrict !== officerDistrictMatch) {
        form.setValue("district", officerDistrictMatch, {
          shouldDirty: false,
          shouldTouch: false,
        });
      }
    }
  }, [form, officerDistrictMatch, user?.role]);

  useEffect(() => {
    if (villageValue && !villageNames.includes(villageValue)) {
      form.setValue("village", "", { shouldDirty: true, shouldTouch: true });
      form.setValue("moo", "", { shouldDirty: true, shouldTouch: true });
    }
  }, [villageNames, villageValue, form]);

  useEffect(() => {
    if (mooValue && !mooNames.includes(mooValue)) {
      form.setValue("moo", "", { shouldDirty: true, shouldTouch: true });
    }
  }, [mooNames, mooValue, form]);

  const editingRecordLocationLabel = useMemo(() => {
    if (!editingRecord) {
      return "ไม่พบข้อมูลพื้นที่";
    }
    const parts = buildLocationParts(
      editingRecord.district,
      editingRecord.subdistrict,
      editingRecord.village,
      editingRecord.moo
    );
    return parts.length > 0 ? parts.join(" · ") : "ไม่พบข้อมูลพื้นที่";
  }, [editingRecord]);

  const editingRecordPeriodLabel = useMemo(() => {
    if (!editingRecord) {
      return "";
    }
    return `${editingRecord.month}/${editingRecord.year}`;
  }, [editingRecord]);

  const showSearchPrompt =
    !findNcdRecordMutation.isPending && searchFeedback.status === "not-found";

  const shouldShowSearchReminder =
    !showMetricsForm &&
    !findNcdRecordMutation.isPending &&
    searchFeedback.status !== "not-found";

  useEffect(() => {
    if (!districtValue) {
      form.setValue("subdistrict", "");
      form.setValue("village", "");
      form.setValue("moo", "");
    }
  }, [districtValue, form]);

  useEffect(() => {
    if (!subdistrictValue) {
      form.setValue("village", "");
      form.setValue("moo", "");
    }
  }, [subdistrictValue, form]);

  const onSubmit = (values: NcdFormValues) => {
    if (hasReferral) {
      if (!Number.isFinite(values.referCount) || values.referCount <= 0) {
        toast.error("กรุณาระบุจำนวนส่งต่อหน่วยบริการให้มากกว่า 0");
        return;
      }
    } else {
      values.referCount = 0;
    }

    saveNcdMutation.mutate(values);
  };

  const handleEditRecord = (record: NcdRecord) => {
    setEditingRecord(record);
    setFormUnlocked(true);
    const locationText = buildLocationParts(
      record.district,
      record.subdistrict,
      record.village,
      record.moo
    ).join(" · ");
    setSearchFeedback({
      status: "found",
      message: `กำลังแก้ไขข้อมูลสำหรับ ${
        locationText || "พื้นที่ที่เลือก"
      } เดือน ${record.month}/${record.year}`,
    });
    form.reset({
      id: record.id,
      targetGroup: record.targetGroup,
      year: record.year,
      month: record.month,
      district: record.district,
      subdistrict: record.subdistrict,
      village: record.village,
      moo: record.moo ?? "",
      referCount: record.referCount ?? 0,
      metrics: {
        Overview: record.metrics.Overview ?? { normal: 0, risk: 0, sick: 0 },
        Obesity: record.metrics.Obesity ?? { normal: 0, risk: 0, sick: 0 },
        Diabetes: record.metrics.Diabetes ?? { normal: 0, risk: 0, sick: 0 },
        Hypertension: record.metrics.Hypertension ?? {
          normal: 0,
          risk: 0,
          sick: 0,
        },
        Mental: record.metrics.Mental ?? { normal: 0, risk: 0, sick: 0 },
        Alcohol: record.metrics.Alcohol ?? { normal: 0, risk: 0, sick: 0 },
        Smoking: record.metrics.Smoking ?? { normal: 0, risk: 0, sick: 0 },
      },
    });
    setHasReferral((record.referCount ?? 0) > 0);
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setSearchFeedback({ status: "idle" });
    resetFormForNewEntry(
      {
        targetGroup: targetGroupValue,
        year: currentThaiYear,
        month: currentMonth,
        district: "",
        subdistrict: "",
        village: "",
        moo: "",
      },
      { unlock: false }
    );
  };

  const computeMetricsDiff = useCallback(
    (baseline: NcdMetrics | undefined, proposed: NcdMetrics): NcdMetrics => {
      const diff: NcdMetrics = {};
      metricStepKeys.forEach((key) => {
        const baselineCategory = baseline?.[key] ?? emptyMetrics[key];
        const proposedCategory = proposed?.[key] ?? emptyMetrics[key];
        diff[key] = {
          normal:
            Number(proposedCategory?.normal ?? 0) -
            Number(baselineCategory?.normal ?? 0),
          risk:
            Number(proposedCategory?.risk ?? 0) -
            Number(baselineCategory?.risk ?? 0),
          sick:
            Number(proposedCategory?.sick ?? 0) -
            Number(baselineCategory?.sick ?? 0),
        };
      });
      return diff;
    },
    []
  );

  const isMetricsDiffEmpty = useCallback(
    (diff: NcdMetrics | null | undefined) => {
      if (!diff) {
        return true;
      }
      return metricStepKeys.every((key) => {
        const category = diff[key];
        if (!category) {
          return true;
        }
        return (
          Number(category.normal || 0) === 0 &&
          Number(category.risk || 0) === 0 &&
          Number(category.sick || 0) === 0
        );
      });
    },
    []
  );

  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [pendingAdjustmentValues, setPendingAdjustmentValues] =
    useState<NcdFormValues | null>(null);

  const pendingAdjustmentDiff = useMemo(() => {
    if (!pendingAdjustmentValues || !editingRecord) {
      return null;
    }
    return computeMetricsDiff(
      editingRecord.metrics,
      pendingAdjustmentValues.metrics
    );
  }, [pendingAdjustmentValues, editingRecord, computeMetricsDiff]);

  const pendingAdjustmentHasChange = useMemo(
    () => !isMetricsDiffEmpty(pendingAdjustmentDiff),
    [pendingAdjustmentDiff, isMetricsDiffEmpty]
  );

  const metricTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    metricStepConfigs.forEach((step) => {
      map[step.key] = step.title;
    });
    return map;
  }, []);

  const adjustmentSummaryRows = useMemo(() => {
    if (!pendingAdjustmentDiff || !pendingAdjustmentValues || !editingRecord) {
      return [] as Array<{
        key: MetricCategoryKey;
        title: string;
        baseline: NcdMetrics[string];
        proposed: NcdMetrics[string];
        diff: NcdMetrics[string];
      }>;
    }

    return metricStepKeys
      .map((key) => {
        const diff = pendingAdjustmentDiff[key];
        if (!diff) {
          return null;
        }
        const hasChange =
          Number(diff.normal || 0) !== 0 ||
          Number(diff.risk || 0) !== 0 ||
          Number(diff.sick || 0) !== 0;
        if (!hasChange) {
          return null;
        }

        const baselineCategory = editingRecord.metrics?.[key] ?? emptyMetrics[key];
        const proposedCategory = pendingAdjustmentValues.metrics?.[key] ?? emptyMetrics[key];

        return {
          key,
          title: metricTitleMap[key] ?? key,
          baseline: baselineCategory,
          proposed: proposedCategory,
          diff,
        };
      })
      .filter((entry): entry is {
        key: MetricCategoryKey;
        title: string;
        baseline: NcdMetrics[string];
        proposed: NcdMetrics[string];
        diff: NcdMetrics[string];
      } => Boolean(entry));
  }, [
    pendingAdjustmentDiff,
    pendingAdjustmentValues,
    editingRecord,
    metricTitleMap,
  ]);

  const formatDelta = useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      return "0";
    }
    const rounded = Math.round(value);
    if (rounded > 0) {
      return `+${rounded.toLocaleString()}`;
    }
    return rounded.toLocaleString();
  }, []);

  const handleCloseAdjustmentDialog = useCallback(() => {
    setAdjustmentDialogOpen(false);
    setPendingAdjustmentValues(null);
    setAdjustmentReason("");
  }, []);

  const recordAdjustmentMutation = useMutation({
    mutationFn: async ({
      values,
      reason,
      baselineRecord,
    }: {
      values: NcdFormValues;
      reason?: string;
      baselineRecord: NcdRecord;
    }) => {
      const diff = computeMetricsDiff(
        baselineRecord.metrics,
        values.metrics
      );
      if (isMetricsDiffEmpty(diff)) {
        throw new Error("ไม่มีการเปลี่ยนแปลงจากข้อมูลเดิม");
      }

      return googleSheetsApi.recordNcdAdjustment({
        id: baselineRecord.id,
        recordId: baselineRecord.id,
        targetGroup: values.targetGroup,
        year: values.year,
        month: values.month,
        district: values.district,
        subdistrict: values.subdistrict,
        village: values.village,
        moo: values.moo,
        metrics: values.metrics,
        reason: reason?.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      toast.success(result.message);
      handleCloseAdjustmentDialog();
      queryClient.invalidateQueries({ queryKey: ["ncd-records"] });
      if (result.record) {
        handleEditRecord(result.record);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenAdjustmentDialog = useCallback(() => {
    if (!editingRecord) {
      toast.error("กรุณาเลือกข้อมูลที่ต้องการปรับก่อน");
      return;
    }
    form.handleSubmit((values) => {
      setPendingAdjustmentValues(values);
      setAdjustmentReason("");
      setAdjustmentDialogOpen(true);
    })();
  }, [editingRecord, form]);

  const handleConfirmAdjustment = useCallback(() => {
    if (!pendingAdjustmentValues || !editingRecord) {
      toast.error("ไม่พบข้อมูลที่ต้องการปรับ");
      return;
    }

    const diff = computeMetricsDiff(
      editingRecord.metrics,
      pendingAdjustmentValues.metrics
    );

    if (isMetricsDiffEmpty(diff)) {
      toast.warning("ไม่มีการเปลี่ยนแปลงจากข้อมูลเดิม");
      return;
    }

    recordAdjustmentMutation.mutate({
      values: pendingAdjustmentValues,
      reason: adjustmentReason,
      baselineRecord: editingRecord,
    });
  }, [
    pendingAdjustmentValues,
    editingRecord,
    adjustmentReason,
    computeMetricsDiff,
    isMetricsDiffEmpty,
    recordAdjustmentMutation,
  ]);

  useEffect(() => {
    handleCloseAdjustmentDialog();
  }, [editingRecord?.id, handleCloseAdjustmentDialog]);


  const handleFindRecord = () => {
    const currentValues = form.getValues();
    const { targetGroup, year, month, district, subdistrict, village, moo } =
      currentValues;

    if (!allFiltersFilled) {
      toast.error(
        "กรุณาระบุกลุ่มเป้าหมาย ปี เดือน อำเภอ ตำบล และหมู่บ้านให้ครบก่อนค้นหา (รวมถึงหมู่ที่)"
      );
      return;
    }

    findNcdRecordMutation.mutate({
      targetGroup,
      year: Number(year),
      month: Number(month),
      district,
      subdistrict,
      village,
      moo: typeof moo === "string" ? moo : String(moo),
    });
  };

  const ncdPagination = ncdRecordsQuery.data;

  const usersPagination = usersQuery.data;
  const usersHasMore =
    usersPagination?.hasMore ??
    (usersPagination
      ? usersPagination.total > usersPagination.page * usersPagination.limit
      : false);
  const usersTotalPages =
    usersPagination && usersPagination.limit
      ? Math.max(1, Math.ceil(usersPagination.total / usersPagination.limit))
      : undefined;

  const rawNcdRecords = ncdPagination?.records;
  const ncdRecords = useMemo(() => {
    if (!rawNcdRecords) {
      return [];
    }
    const records = [...rawNcdRecords];
    const resolveTimestamp = (record: NcdRecord) => {
      const source = record.updatedAt ?? record.createdAt ?? null;
      if (!source) {
        return 0;
      }
      if (source instanceof Date) {
        return source.getTime();
      }
      const parsed = new Date(source);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };
    records.sort((a, b) => resolveTimestamp(b) - resolveTimestamp(a));
    return records;
  }, [rawNcdRecords]);
  const ncdTotalCount = ncdPagination?.total ?? 0;
  const latestShowingCount = ncdRecords.length;
  const targetGroupDisplay =
    targetGroupLabels[targetGroupValue] ?? "ไม่ระบุ";
  const thaiDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );
  const formatRecordTimestamp = useCallback(
    (value?: string | Date | null) => {
      if (!value) {
        return "-";
      }
      const dateValue =
        value instanceof Date ? value : new Date(value);
      if (Number.isNaN(dateValue.getTime())) {
        return "-";
      }
      return thaiDateTimeFormatter.format(dateValue);
    },
    [thaiDateTimeFormatter]
  );
  const formatPeriodLabel = useCallback((month: number, year: number) => {
    const monthIndex = Number.isFinite(month) ? Math.round(month) : month;
    const monthName =
      monthOptions[monthIndex - 1] ?? `เดือน ${String(month).padStart(2, "0")}`;
    return `${monthName} ${year}`;
  }, []);
  const usersData: UsersListResponse | undefined = usersPagination;
  const passwordDialogTargetName =
    passwordDialogAccount?.name?.trim().length
      ? passwordDialogAccount.name
      : passwordDialogAccount?.username ?? "";
  const passwordDialogRequiresCurrentPassword = Boolean(
    passwordDialogAccount &&
      user?.id === passwordDialogAccount.id &&
      !isAdmin
  );
  const combinedQueries = [
    districtMappingQuery,
    ncdRecordsQuery,
    canManageUsers ? usersQuery : undefined,
  ];
  const handlePasswordSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!passwordDialogAccount) {
        return;
      }

      const newPassword = passwordForm.newPassword;
      const confirmPassword = passwordForm.confirmPassword;
      const currentPassword = passwordForm.currentPassword;
      const requiresCurrentPassword = passwordDialogRequiresCurrentPassword;

      if (!newPassword) {
        toast.error("กรุณาระบุรหัสผ่านใหม่");
        return;
      }

      if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
        toast.error(PASSWORD_POLICY_MESSAGE);
        return;
      }

      if (!confirmPassword) {
        toast.error("กรุณายืนยันรหัสผ่านใหม่");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("รหัสผ่านใหม่และยืนยันไม่ตรงกัน");
        return;
      }

      if (requiresCurrentPassword && !currentPassword) {
        toast.error("กรุณาระบุรหัสผ่านปัจจุบัน");
        return;
      }

      changePasswordMutation.mutate({
        id: passwordDialogAccount.id,
        username: passwordDialogAccount.username,
        password: newPassword,
        confirmPassword,
        currentPassword: requiresCurrentPassword ? currentPassword : undefined,
      });
    },
    [
      changePasswordMutation,
      passwordDialogAccount,
      passwordDialogRequiresCurrentPassword,
      passwordForm.confirmPassword,
      passwordForm.currentPassword,
      passwordForm.newPassword,
    ]
  );
  const { isInitialLoading: showInitialLoading } =
    getCombinedQueryState(combinedQueries);
  const showNcdRefreshing =
    ncdRecordsQuery.fetchStatus === "fetching" &&
    ncdRecordsQuery.status !== "pending";
  const showUsersRefreshing =
    canManageUsers &&
    usersQuery.fetchStatus === "fetching" &&
    usersQuery.status !== "pending";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </header>

        {showInitialLoading ? (
          <LoadingState message={loadingMessage} />
        ) : (
          <Tabs defaultValue="data" className="space-y-6">
            <TabsList
              className={`grid w-full ${
                resolvedLayout === "officer" ? "max-w-xl" : "max-w-2xl"
              } ${canManageUsers ? "grid-cols-3" : "grid-cols-2"}`}
            >
              <TabsTrigger value="data" className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                จัดการข้อมูล NCD
              </TabsTrigger>
              <TabsTrigger value="districts" className="gap-2">
                <MapPin className="w-4 h-4" />
                จัดการข้อมูลตำบล
              </TabsTrigger>
              {canManageUsers && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  จัดการผู้ใช้งาน
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="data" className="space-y-6">
              <Card
                className={
                  editingRecord ? "border-amber-200 bg-amber-50/40" : undefined
                }
              >
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <ActivitySquare className="w-5 h-5 text-primary" />
                      {editingRecord ? "แก้ไขข้อมูล NCD" : "บันทึกข้อมูล NCD"}
                      {editingRecord ? (
                        <Badge
                          className="border-amber-200 bg-amber-100 text-amber-800"
                          variant="outline"
                        >
                          กำลังแก้ไขข้อมูลนี้
                        </Badge>
                      ) : null}
                    </CardTitle>
                    {isAdmin ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2 shrink-0"
                          onClick={() =>
                            invalidateDistrictCacheMutation.mutate()
                          }
                          disabled={
                            invalidateDistrictCacheMutation.isPending ||
                            districtMappingQuery.isFetching
                          }
                        >
                          {invalidateDistrictCacheMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="sr-only">รีเฟรชข้อมูลพื้นที่</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingRecord ? (
                    <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-700">
                      <AlertTitle>กำลังแก้ไขข้อมูลที่มีอยู่</AlertTitle>
                      <AlertDescription>
                        {`${editingRecordLocationLabel} · เดือน ${editingRecordPeriodLabel}`}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <form
                    className="space-y-6"
                    onSubmit={form.handleSubmit(onSubmit)}
                  >
                    <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
                      <div className="space-y-6">
                        <section className="space-y-4 rounded-lg border bg-muted/40 p-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold">
                              ช่วงเวลาและกลุ่มเป้าหมาย
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              เลือกช่วงเวลาที่ต้องการบันทึก
                              พร้อมกำหนดกลุ่มประชากร
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                              <Label>กลุ่มเป้าหมาย</Label>
                              <Select
                                value={form.watch("targetGroup")}
                                onValueChange={(value) => {
                                  form.setValue(
                                    "targetGroup",
                                    value as "general" | "monk"
                                  );
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกกลุ่มเป้าหมาย" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="general">
                                    บุคคลทั่วไป
                                  </SelectItem>
                                  <SelectItem value="monk">พระสงฆ์</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>ปี (พ.ศ.)</Label>
                              <Input
                                type="number"
                                {...form.register("year", {
                                  valueAsNumber: true,
                                })}
                              />
                              <p className="text-xs text-muted-foreground">
                                ตัวอย่าง: {currentThaiYear}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>เดือน</Label>
                              <Select
                                value={
                                  Number.isFinite(monthValue)
                                    ? String(monthValue)
                                    : ""
                                }
                                onValueChange={(value) =>
                                  form.setValue("month", Number(value))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกเดือน" />
                                </SelectTrigger>
                                <SelectContent>
                                  {monthOptions.map((label, index) => (
                                    <SelectItem
                                      key={label}
                                      value={String(index + 1)}
                                    >
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4 rounded-lg border bg-muted/40 p-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold">
                              พื้นที่รับผิดชอบ
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              ระบุพื้นที่ให้ครบทุกระดับก่อนค้นหา
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>อำเภอ</Label>
                              <Select
                                value={districtValue}
                                onValueChange={(value) => {
                                  form.setValue("district", value);
                                }}
                                disabled={user?.role === "officer"}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกอำเภอ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {districtNames.map((district) => (
                                    <SelectItem key={district} value={district}>
                                      {district}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>ตำบล</Label>
                              <Select
                                value={subdistrictValue}
                                onValueChange={(value) =>
                                  form.setValue("subdistrict", value)
                                }
                                disabled={!districtValue}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกตำบล" />
                                </SelectTrigger>
                                <SelectContent>
                                  {subdistrictNames.map((subdistrict) => (
                                    <SelectItem
                                      key={subdistrict}
                                      value={subdistrict}
                                    >
                                      {subdistrict}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>หมู่บ้าน</Label>
                              <Select
                                value={villageValue ?? ""}
                                onValueChange={(value) =>
                                  form.setValue("village", value)
                                }
                                disabled={!subdistrictValue}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกหมู่บ้าน" />
                                </SelectTrigger>
                                <SelectContent>
                                  {villageNames.map((village) => (
                                    <SelectItem key={village} value={village}>
                                      {village}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>หมู่ที่</Label>
                              <Select
                                value={mooValue ?? ""}
                                onValueChange={(value) =>
                                  form.setValue("moo", value)
                                }
                                disabled={
                                  !subdistrictValue || mooNames.length === 0
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      mooNames.length > 0
                                        ? "เลือกหมู่ที่"
                                        : "ไม่มีข้อมูลหมู่ในชีต"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {mooNames.map((moo) => (
                                    <SelectItem key={moo} value={moo}>
                                      {formatMooLabel(moo)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
                          <div className="space-y-1">
                            <h3
                              id="monthly-adjustment-heading"
                              className="text-sm font-semibold text-primary"
                            >
                              ค้นหาข้อมูลในระบบ
                            </h3>
                            <p className="text-xs text-primary/80">
                              เลือกตัวกรองให้ครบทุกช่อง
                              แล้วกดค้นหาเพื่อนำข้อมูลเดิมมาแก้ไข
                              หรือเปิดฟอร์มใหม่
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button
                              type="button"
                              size="lg"
                              className="gap-2 px-6 w-full sm:w-auto justify-center"
                              onClick={handleFindRecord}
                              disabled={
                                findNcdRecordMutation.isPending ||
                                !allFiltersFilled
                              }
                            >
                              {findNcdRecordMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Search className="w-4 h-4" />
                              )}
                              <span className="sr-only">ค้นหาข้อมูล</span>
                            </Button>
                          </div>
                        </section>


                      </div>

                      <div className="space-y-4">
                        {showSearchPrompt ? (
                          <Alert className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 text-amber-700">
                            <div className="space-y-1">
                              <AlertTitle>ไม่พบข้อมูลตามตัวกรองนี้</AlertTitle>
                              <AlertDescription>
                                {searchFeedback.message}
                              </AlertDescription>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-amber-200 text-amber-700 hover:bg-amber-100"
                              onClick={() => {
                                setSearchFeedback({ status: "idle" });
                                resetFormForNewEntry({}, { unlock: true });
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              <span className="sr-only">สร้างใหม่</span>
                            </Button>
                          </Alert>
                        ) : null}
                        {searchFeedback.status === "error" ? (
                          <Alert variant="destructive">
                            <AlertTitle>ค้นหาไม่สำเร็จ</AlertTitle>
                            <AlertDescription>
                              {searchFeedback.message}
                            </AlertDescription>
                          </Alert>
                        ) : null}
                        {findNcdRecordMutation.isPending ? (
                          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 py-12 text-primary">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p>กำลังค้นหาข้อมูล...</p>
                          </div>
                        ) : showMetricsForm ? (
                          <>
                            <section className="space-y-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    ขั้นตอน {metricsStepIndex + 1} /{" "}
                                    {totalStepCount}
                                  </p>
                                  <h3 className="text-base font-semibold">
                                    {currentStep.title}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {currentStep.description}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary">
                                    ขั้น {metricsStepIndex + 1} /{" "}
                                    {totalStepCount}
                                  </Badge>
                                  {editingRecord ? (
                                    <Badge
                                      variant="outline"
                                      className="hidden sm:flex border-amber-200 text-amber-800"
                                    >
                                      {editingRecordLocationLabel}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              {isMetricStep && currentMetricKey ? (
                                <div
                                  key={currentMetricKey}
                                  className="space-y-4 rounded-lg border bg-muted/30 p-4"
                                >
                                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {METRIC_FIELDS.map((field) => (
                                      <div
                                        key={field.key}
                                        className="space-y-2"
                                      >
                                        <Label
                                          className={`text-xs font-medium ${field.accent}`}
                                        >
                                          {field.label}
                                        </Label>
                                        <Controller
                                          control={form.control}
                                          name={`metrics.${currentMetricKey}.${field.key}`}
                                          render={({
                                            field: controllerField,
                                          }) => {
                                            const displayValue =
                                              normalizeMetricValue(
                                                controllerField.value
                                              );
                                            return (
                                              <Input
                                                ref={controllerField.ref}
                                                type="number"
                                                min={0}
                                                max={
                                                  currentMetricKey ===
                                                  "Overview"
                                                    ? undefined
                                                    : Math.max(0, overviewTotal)
                                                }
                                                value={displayValue}
                                                onBlur={controllerField.onBlur}
                                                onChange={(event) => {
                                                  const raw =
                                                    event.target.value;
                                                  const numericValue =
                                                    raw === ""
                                                      ? 0
                                                      : Number(raw);
                                                  const boundedValue =
                                                    clampMetricValue(
                                                      currentMetricKey,
                                                      field.key,
                                                      numericValue
                                                    );
                                                  controllerField.onChange(
                                                    boundedValue
                                                  );
                                                }}
                                                inputMode="numeric"
                                              />
                                            );
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                      <span>
                                        {currentMetricKey === "Overview"
                                          ? `รวมทั้งหมด ${overviewTotal.toLocaleString()} คน`
                                          : `ยอดรวม ${currentCategoryTotal.toLocaleString()} คน`}
                                      </span>
                                      {currentMetricKey !== "Overview" ? (
                                        <span
                                          className={
                                            remainingForCategory > 0
                                              ? "text-destructive font-medium"
                                              : undefined
                                          }
                                        >
                                          ต้องกรอกอีก{" "}
                                          {remainingForCategory.toLocaleString()}{" "}
                                          คน
                                        </span>
                                      ) : null}
                                    </div>
                                    {showOverviewWarning ? (
                                      <Alert
                                        variant="destructive"
                                        className="mt-2"
                                      >
                                        <AlertTitle>
                                          ยังไม่ได้ระบุจำนวนภาพรวม
                                        </AlertTitle>
                                        <AlertDescription>
                                          กรุณากรอกข้อมูลภาพรวมให้มากกว่า 0
                                          คนก่อนดำเนินการต่อ
                                        </AlertDescription>
                                      </Alert>
                                    ) : null}
                                    {showRemainingWarning ? (
                                      <Alert
                                        variant="destructive"
                                        className="mt-2"
                                      >
                                        <AlertTitle>จำนวนยังไม่ครบ</AlertTitle>
                                        <AlertDescription>
                                          ยังเหลืออีก{" "}
                                          {remainingForCategory.toLocaleString()}{" "}
                                          คนที่ต้องระบุ
                                        </AlertDescription>
                                      </Alert>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                      มีการส่งต่อหน่วยบริการหรือไม่?
                                    </Label>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                      <Button
                                        type="button"
                                        variant={
                                          hasReferral ? "outline" : "default"
                                        }
                                        className="sm:w-auto w-full"
                                        onClick={() => {
                                          setHasReferral(false);
                                          form.setValue("referCount", 0, {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                          });
                                        }}
                                      >
                                        ไม่มี
                                      </Button>
                                      <Button
                                        type="button"
                                        variant={
                                          hasReferral ? "default" : "outline"
                                        }
                                        className="sm:w-auto w-full"
                                        onClick={() => {
                                          setHasReferral(true);
                                          if (referCountNumber < 0) {
                                            form.setValue("referCount", 0, {
                                              shouldDirty: false,
                                              shouldTouch: false,
                                            });
                                          }
                                        }}
                                      >
                                        มี
                                      </Button>
                                    </div>
                                  </div>
                                  {hasReferral ? (
                                    <div className="space-y-2 max-w-[260px]">
                                      <Label htmlFor="referCountInput">
                                        จำนวนส่งต่อหน่วยบริการ (คน)
                                      </Label>
                                      <Controller
                                        control={form.control}
                                        name="referCount"
                                        render={({ field }) => (
                                          <Input
                                            id="referCountInput"
                                            ref={field.ref}
                                            type="number"
                                            min={1}
                                            value={
                                              Number.isFinite(field.value)
                                                ? field.value
                                                : ""
                                            }
                                            onBlur={field.onBlur}
                                            onChange={(event) => {
                                              const raw = event.target.value;
                                              const nextValue =
                                                raw === "" ? 0 : Number(raw);
                                              field.onChange(
                                                Number.isFinite(nextValue)
                                                  ? nextValue
                                                  : 0
                                              );
                                            }}
                                            inputMode="numeric"
                                          />
                                        )}
                                      />
                                      {referralNeedsAttention ? (
                                        <p className="text-xs text-destructive">
                                          กรุณากรอกจำนวนมากกว่า 0
                                        </p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">
                                          ระบุจำนวนผู้ที่ส่งต่อไปยังหน่วยบริการ
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      ระบบจะบันทึกว่าไม่มีการส่งต่อ (0 คน)
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                {isFirstMetricStep ? (
                                  <div className="hidden sm:block" />
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="sm:w-auto w-full"
                                    onClick={goToPreviousMetricStep}
                                  >
                                    ย้อนกลับ
                                  </Button>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                  {isLastStep ? (
                                    <>
                                      <div className="flex w-full flex-col gap-2 sm:flex-row">
                                        {editingRecord ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="sm:w-auto w-full"
                                            onClick={handleCancelEdit}
                                          >
                                            ยกเลิกการแก้ไข
                                          </Button>
                                        ) : (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="sm:w-auto w-full"
                                            onClick={() => {
                                              setSearchFeedback({
                                                status: "idle",
                                              });
                                              resetFormForNewEntry(
                                                {
                                                  targetGroup: targetGroupValue,
                                                  year: currentThaiYear,
                                                  month: currentMonth,
                                                  district: "",
                                                  subdistrict: "",
                                                  village: "",
                                                  moo: "",
                                                },
                                                { unlock: true }
                                              );
                                            }}
                                          >
                                            ล้างฟอร์ม
                                          </Button>
                                        )}
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              type="button"
                                              className="gap-2 sm:w-auto w-full"
                                              disabled={
                                                saveNcdMutation.isPending ||
                                                referralNeedsAttention
                                              }
                                            >
                                              {saveNcdMutation.isPending && (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                              )}
                                              {editingRecord
                                                ? "บันทึกการแก้ไข"
                                                : "บันทึกข้อมูล"}
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                {editingRecord
                                                  ? "ยืนยันการบันทึกการแก้ไข"
                                                  : "ยืนยันการบันทึกข้อมูล"}
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                {`ระบบจะบันทึกข้อมูล NCD สำหรับ ${currentLocationLabel} · เดือน ${currentPeriodLabel}`}
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                ยกเลิก
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                disabled={
                                                  saveNcdMutation.isPending
                                                }
                                                onClick={() =>
                                                  form.handleSubmit(onSubmit)()
                                                }
                                              >
                                                {editingRecord
                                                  ? "ยืนยันการแก้ไข"
                                                  : "ยืนยันการบันทึก"}
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                        {editingRecord ? (
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            className="gap-2 sm:w-auto w-full"
                                            disabled={
                                              recordAdjustmentMutation.isPending ||
                                              referralNeedsAttention
                                            }
                                            onClick={handleOpenAdjustmentDialog}
                                          >
                                            {recordAdjustmentMutation.isPending ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <ActivitySquare className="h-4 w-4" />
                                            )}
                                            บันทึกเป็นการปรับยอด
                                          </Button>
                                        ) : null}
                                      </div>
                                      {editingRecord ? (
                                        <Dialog
                                          open={adjustmentDialogOpen}
                                          onOpenChange={(open) => {
                                            if (!open) {
                                              handleCloseAdjustmentDialog();
                                            }
                                          }}
                                        >
                                          <DialogContent className="sm:max-w-xl">
                                            <DialogHeader>
                                              <DialogTitle>ยืนยันการปรับยอดรายเดือน</DialogTitle>
                                              <DialogDescription>
                                                {`ระบบจะบันทึกยอดปรับสำหรับ ${currentLocationLabel} · เดือน ${currentPeriodLabel}`}
                                              </DialogDescription>
                                            </DialogHeader>
                                            {pendingAdjustmentValues ? (
                                              <div className="space-y-4">
                                                {pendingAdjustmentHasChange ? (
                                                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                                    <p className="font-semibold">
                                                      รายการปรับ
                                                    </p>
                                                    <ul className="mt-2 space-y-2">
                                                      {adjustmentSummaryRows.map((row) => {
                                                        const totalBaseline =
                                                          Number(row.baseline?.normal || 0) +
                                                          Number(row.baseline?.risk || 0) +
                                                          Number(row.baseline?.sick || 0);
                                                        const totalProposed =
                                                          Number(row.proposed?.normal || 0) +
                                                          Number(row.proposed?.risk || 0) +
                                                          Number(row.proposed?.sick || 0);
                                                        const totalDiff = totalProposed - totalBaseline;
                                                        return (
                                                          <li key={row.key} className="flex flex-col gap-1">
                                                            <span className="font-medium">
                                                              {row.title}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                              ปกติ {formatDelta(row.diff.normal)} · เสี่ยง {formatDelta(row.diff.risk)} · ป่วย {formatDelta(row.diff.sick)} (รวม {formatDelta(totalDiff)})
                                                            </span>
                                                          </li>
                                                        );
                                                      })}
                                                    </ul>
                                                  </div>
                                                ) : (
                                                  <Alert variant="destructive">
                                                    <AlertTitle>ไม่มีการเปลี่ยนแปลง</AlertTitle>
                                                    <AlertDescription>
                                                      ปรับค่าตัวเลขก่อนยืนยันการบันทึก
                                                    </AlertDescription>
                                                  </Alert>
                                                )}
                                                <div className="space-y-2">
                                                  <Label htmlFor="adjustment-reason-input">
                                                    หมายเหตุ (ไม่บังคับ)
                                                  </Label>
                                                  <textarea
                                                    id="adjustment-reason-input"
                                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="ระบุสาเหตุ เช่น ผู้ป่วยหายดี / คีย์ข้อมูลเกิน"
                                                    value={adjustmentReason}
                                                    onChange={(event) =>
                                                      setAdjustmentReason(event.target.value)
                                                    }
                                                  />
                                                  <p className="text-xs text-muted-foreground">
                                                    ข้อความนี้จะถูกบันทึกในประวัติการปรับยอด
                                                  </p>
                                                </div>
                                              </div>
                                            ) : (
                                              <LoadingState message="กำลังเตรียมข้อมูลการปรับ..." />
                                            )}
                                            <DialogFooter>
                                              <DialogClose asChild>
                                                <Button type="button" variant="outline">
                                                  ยกเลิก
                                                </Button>
                                              </DialogClose>
                                              <Button
                                                type="button"
                                                className="gap-2"
                                                onClick={handleConfirmAdjustment}
                                                disabled={
                                                  recordAdjustmentMutation.isPending ||
                                                  !pendingAdjustmentHasChange
                                                }
                                              >
                                                {recordAdjustmentMutation.isPending ? (
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                  <ActivitySquare className="h-4 w-4" />
                                                )}
                                                ยืนยันการปรับยอด
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      ) : null}
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      className="sm:w-auto w-full gap-2"
                                      onClick={goToNextMetricStep}
                                      disabled={isNextDisabled}
                                    >
                                      ต่อไป
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </section>
                          </>
                        ) : shouldShowSearchReminder ? (
                          <Alert className="border border-dashed border-primary/40 bg-primary/5 text-primary">
                            <AlertTitle>กรุณาค้นหาข้อมูลก่อน</AlertTitle>
                            <AlertDescription>
                              กด "ค้นหาข้อมูล"
                              เพื่อโหลดข้อมูลที่บันทึกไว้หรือเปิดฟอร์มใหม่
                              และกรุณาเลือกทุกตัวกรองให้ครบก่อนกรอกข้อมูลตามกลุ่มโรค
                            </AlertDescription>
                          </Alert>
                        ) : null}
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลที่บันทึกล่าสุด</CardTitle>
                  <CardDescription>
                    {ncdTotalCount > 0
                      ? `รายการที่บันทึกหรือแก้ไขล่าสุด ${latestShowingCount.toLocaleString()} รายการ`
                      : "ยังไม่มีข้อมูลที่บันทึกในระบบสำหรับกลุ่มเป้าหมายนี้"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        กลุ่มเป้าหมาย: {targetGroupDisplay}
                      </Badge>
                      <Badge variant="outline">
                        ล่าสุด {latestShowingCount.toLocaleString()} รายการ
                      </Badge>
                      <Badge variant="outline">
                        ทั้งหมด {ncdTotalCount.toLocaleString()} รายการ
                      </Badge>
                    </div>
                    {ncdTotalCount > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        เรียงตามเวลาบันทึก/แก้ไขล่าสุด (สูงสุด {NCD_PAGE_SIZE.toLocaleString()} รายการ)
                      </span>
                    ) : null}
                  </div>
                  {showNcdRefreshing ? (
                    <p className="text-sm text-muted-foreground">
                      กำลังอัปเดตข้อมูลล่าสุด...
                    </p>
                  ) : ncdRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีข้อมูลในระบบสำหรับกลุ่มเป้าหมายนี้
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {ncdRecords.map((record) => {
                        const baselineMetrics = record.baselineMetrics ?? record.metrics;
                        const adjustedMetrics = record.adjustedMetrics ?? baselineMetrics;
                        const aggregatedDiff = record.adjustments ?? emptyMetrics;
                        const baselineOverview = baselineMetrics.Overview ?? {
                          normal: 0,
                          risk: 0,
                          sick: 0,
                        };
                        const adjustedOverview = adjustedMetrics.Overview ?? baselineOverview;
                        const overviewDiff = {
                          normal:
                            Number(adjustedOverview.normal || 0) -
                            Number(baselineOverview.normal || 0),
                          risk:
                            Number(adjustedOverview.risk || 0) -
                            Number(baselineOverview.risk || 0),
                          sick:
                            Number(adjustedOverview.sick || 0) -
                            Number(baselineOverview.sick || 0),
                        };
                        const totalBaseline =
                          baselineOverview.normal +
                          baselineOverview.risk +
                          baselineOverview.sick;
                        const totalAdjusted =
                          adjustedOverview.normal +
                          adjustedOverview.risk +
                          adjustedOverview.sick;
                        const totalPeople = totalAdjusted;
                        const totalDiff = totalAdjusted - totalBaseline;
                        const referCount = record.referCount ?? 0;
                        const periodLabel =
                          record.periodLabel ??
                          formatPeriodLabel(record.month, record.year);
                        const lastUpdatedSource =
                          record.updatedAt ?? record.createdAt ?? null;
                        const lastUpdatedDisplay =
                          formatRecordTimestamp(lastUpdatedSource);
                        const actorName = record.updatedBy || record.createdBy;
                        const districtName = record.district || "ไม่ระบุอำเภอ";
                        const locationDetails: string[] = [];
                        if (record.subdistrict) {
                          locationDetails.push(`ตำบล ${record.subdistrict}`);
                        }
                        if (record.village) {
                          locationDetails.push(`หมู่บ้าน ${record.village}`);
                        }
                        if (record.moo) {
                          locationDetails.push(`หมู่ที่ ${record.moo}`);
                        }
                        const adjustmentHistory = Array.isArray(record.adjustmentEntries)
                          ? record.adjustmentEntries
                          : [];
                        const hasAdjustmentHistory = adjustmentHistory.length > 0;
                        const hasAggregatedDiff = !isMetricsDiffEmpty(aggregatedDiff);
                        const detailLocationParts = buildLocationParts(
                          record.district,
                          record.subdistrict,
                          record.village,
                          record.moo
                        );
                        const detailLocationText =
                          detailLocationParts.length > 0
                            ? detailLocationParts.join(" · ")
                            : "ไม่พบข้อมูลพื้นที่";
                        const detailTargetGroupLabel =
                          targetGroupLabels[record.targetGroup] ?? "-";
                        const detailPeriodText =
                          record.periodLabel ??
                          formatPeriodLabel(record.month, record.year);
                        const detailReferCount = Number(record.referCount ?? 0);
                        const detailCreatedBy =
                          record.createdBy ?? "ไม่พบข้อมูลผู้บันทึก";
                        const detailCreatedAtDisplay = formatRecordTimestamp(
                          record.createdAt ?? null
                        );
                        const detailUpdatedBy =
                          record.updatedBy ??
                          record.createdBy ??
                          "ไม่พบข้อมูลผู้แก้ไข";
                        const detailUpdatedAtDisplay = formatRecordTimestamp(
                          record.updatedAt ?? record.createdAt ?? null
                        );
                        const detailMetricsRows = metricStepConfigs.map(
                          (metric) => {
                            const baselineCategory = baselineMetrics[metric.key] ?? {
                              normal: 0,
                              risk: 0,
                              sick: 0,
                            };
                            const adjustedCategory = adjustedMetrics[metric.key] ?? baselineCategory;
                            const diffCategory = aggregatedDiff[metric.key] ?? {
                              normal: 0,
                              risk: 0,
                              sick: 0,
                            };
                            const baselineTotal =
                              Number(baselineCategory.normal || 0) +
                              Number(baselineCategory.risk || 0) +
                              Number(baselineCategory.sick || 0);
                            const adjustedTotal =
                              Number(adjustedCategory.normal || 0) +
                              Number(adjustedCategory.risk || 0) +
                              Number(adjustedCategory.sick || 0);
                            return {
                              key: metric.key,
                              title: metric.title,
                              baseline: baselineCategory,
                              adjusted: adjustedCategory,
                              diff: diffCategory,
                              baselineTotal,
                              adjustedTotal,
                              totalDiff: adjustedTotal - baselineTotal,
                            };
                          }
                        );

                        return (
                          <Dialog key={record.id}>
                            <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/40">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="outline">
                                      {periodLabel}
                                    </Badge>
                                    <Badge variant="secondary">
                                      กลุ่มเป้าหมาย{" "}
                                      {targetGroupLabels[record.targetGroup] ??
                                        "-"}
                                    </Badge>
                                  </div>
                                <div className="space-y-1">
                                  <p className="text-lg font-semibold">
                                    {districtName}
                                  </p>
                                  {locationDetails.length > 0 ? (
                                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4 text-primary" />
                                      {locationDetails.join(" · ")}
                                    </p>
                                  ) : null}
                                  {hasAggregatedDiff ? (
                                    <p className="text-xs text-amber-600">
                                      มีการปรับยอด {formatDelta(totalDiff)} คน (ก่อนปรับ {totalBaseline.toLocaleString()} → หลังปรับ {totalPeople.toLocaleString()})
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                                <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground md:items-end">
                                  <span className="inline-flex items-center gap-2 text-left">
                                    <Clock3 className="h-4 w-4 text-primary" />
                                    {lastUpdatedDisplay !== "-"
                                      ? `อัปเดตล่าสุด ${lastUpdatedDisplay}`
                                      : "ไม่มีข้อมูลเวลาที่บันทึก"}
                                  </span>
                                  {actorName ? (
                                    <span>โดย {actorName}</span>
                                  ) : null}
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="self-stretch md:self-auto inline-flex items-center justify-center"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">ดูรายละเอียด</span>
                                    </Button>
                                  </DialogTrigger>
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                                <div className="rounded-md border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">
                                    ปกติ
                                  </p>
                                  <p className="text-lg font-semibold text-success">
                                    {adjustedOverview.normal.toLocaleString()}
                                  </p>
                                  {overviewDiff.normal !== 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {formatDelta(overviewDiff.normal)}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="rounded-md border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">
                                    เสี่ยง
                                  </p>
                                  <p className="text-lg font-semibold text-warning">
                                    {adjustedOverview.risk.toLocaleString()}
                                  </p>
                                  {overviewDiff.risk !== 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {formatDelta(overviewDiff.risk)}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="rounded-md border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">
                                    ป่วย
                                  </p>
                                  <p className="text-lg font-semibold text-destructive">
                                    {adjustedOverview.sick.toLocaleString()}
                                  </p>
                                  {overviewDiff.sick !== 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {formatDelta(overviewDiff.sick)}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="rounded-md border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">
                                    รวมทั้งหมด
                                  </p>
                                  <p className="text-lg font-semibold">
                                    {totalPeople.toLocaleString()}
                                  </p>
                                  {totalDiff !== 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {formatDelta(totalDiff)}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="rounded-md border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">
                                    ส่งต่อ
                                  </p>
                                  <p
                                    className={`text-lg font-semibold ${
                                      referCount > 0
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {referCount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <DialogContent
                              aria-describedby="ncd-record-detail-description"
                              className="max-w-4xl"
                            >
                              <DialogHeader>
                                <DialogTitle>รายละเอียดข้อมูลบันทึก</DialogTitle>
                                <DialogDescription id="ncd-record-detail-description">
                                  {`ข้อมูลกลุ่ม ${detailTargetGroupLabel} รอบ ${detailPeriodText}`}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                      พื้นที่
                                    </p>
                                    <p className="font-medium">
                                      {detailLocationText}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                      กลุ่มเป้าหมาย
                                    </p>
                                    <p className="font-medium">
                                      {detailTargetGroupLabel}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                      รอบบันทึก
                                    </p>
                                    <p className="font-medium">
                                      {detailPeriodText}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                      ส่งต่อหน่วยบริการ
                                    </p>
                                    <p
                                      className={`font-semibold ${
                                        detailReferCount > 0
                                          ? "text-primary"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {detailReferCount.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-1 rounded-md border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                                      ผู้บันทึก
                                    </p>
                                    <p className="font-medium">
                                      {detailCreatedBy}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {detailCreatedAtDisplay}
                                    </p>
                                  </div>
                                  <div className="space-y-1 rounded-md border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                                      ผู้แก้ไขล่าสุด
                                    </p>
                                    <p className="font-medium">
                                      {detailUpdatedBy}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {detailUpdatedAtDisplay}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <p className="text-sm font-semibold">
                                    รายละเอียดโรคตามกลุ่มอาการ
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>กลุ่มโรค</TableHead>
                                        <TableHead className="text-right">
                                          ปกติ (หลังปรับ)
                                        </TableHead>
                                        <TableHead className="text-right">
                                          เสี่ยง (หลังปรับ)
                                        </TableHead>
                                        <TableHead className="text-right">
                                          ป่วย (หลังปรับ)
                                        </TableHead>
                                        <TableHead className="text-right">
                                          รวม (หลังปรับ)
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {detailMetricsRows.map((metric) => (
                                        <TableRow key={metric.key}>
                                          <TableCell className="font-medium">
                                            {metric.title}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {Number(metric.adjusted.normal || 0).toLocaleString()}
                                            {Number(metric.diff.normal || 0) !== 0 ? (
                                              <div className="text-xs text-muted-foreground">
                                                {formatDelta(metric.diff.normal)} (เดิม {Number(metric.baseline.normal || 0).toLocaleString()})
                                              </div>
                                            ) : null}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {Number(metric.adjusted.risk || 0).toLocaleString()}
                                            {Number(metric.diff.risk || 0) !== 0 ? (
                                              <div className="text-xs text-muted-foreground">
                                                {formatDelta(metric.diff.risk)} (เดิม {Number(metric.baseline.risk || 0).toLocaleString()})
                                              </div>
                                            ) : null}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {Number(metric.adjusted.sick || 0).toLocaleString()}
                                            {Number(metric.diff.sick || 0) !== 0 ? (
                                              <div className="text-xs text-muted-foreground">
                                                {formatDelta(metric.diff.sick)} (เดิม {Number(metric.baseline.sick || 0).toLocaleString()})
                                              </div>
                                            ) : null}
                                          </TableCell>
                                          <TableCell className="text-right font-semibold">
                                            {Number(metric.adjustedTotal || 0).toLocaleString()}
                                            {Number(metric.totalDiff || 0) !== 0 ? (
                                              <div className="text-xs text-muted-foreground">
                                                {formatDelta(metric.totalDiff)} (เดิม {Number(metric.baselineTotal || 0).toLocaleString()})
                                              </div>
                                            ) : null}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {hasAggregatedDiff ? (
                                    <p className="text-xs text-muted-foreground">
                                      รวมก่อนปรับ {totalBaseline.toLocaleString()} คน · หลังปรับ {totalPeople.toLocaleString()} คน ({formatDelta(totalDiff)})
                                    </p>
                                  ) : null}
                                </div>
                                {hasAdjustmentHistory ? (
                                  <div className="space-y-3">
                                    <p className="text-sm font-semibold">
                                      ประวัติการปรับยอด
                                    </p>
                                    <div className="space-y-2">
                                      {adjustmentHistory
                                        .slice()
                                        .reverse()
                                        .map((entry) => {
                                          const entryOverview = entry.diff?.Overview ?? {
                                            normal: 0,
                                            risk: 0,
                                            sick: 0,
                                          };
                                          const entryTotal =
                                            Number(entryOverview.normal || 0) +
                                            Number(entryOverview.risk || 0) +
                                            Number(entryOverview.sick || 0);
                                          const entryTimestamp = formatRecordTimestamp(
                                            entry.createdAt ?? null
                                          );
                                          return (
                                            <div
                                              key={entry.id}
                                              className="rounded-md border bg-muted/10 p-3 text-xs sm:text-sm"
                                            >
                                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="font-medium">
                                                  {entryTimestamp}
                                                </span>
                                                <span className="text-muted-foreground">
                                                  {entry.createdBy
                                                    ? `โดย ${entry.createdBy}`
                                                    : "ไม่ระบุผู้บันทึก"}
                                                </span>
                                              </div>
                                              <p className="text-muted-foreground">
                                                ปรับ {formatDelta(entryTotal)} คน (ปกติ {formatDelta(entryOverview.normal)}, เสี่ยง {formatDelta(entryOverview.risk)}, ป่วย {formatDelta(entryOverview.sick)})
                                              </p>
                                              {entry.reason ? (
                                                <p className="text-muted-foreground">
                                                  เหตุผล: {entry.reason}
                                                </p>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="outline">
                                    ปิด
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="districts" className="space-y-6">
              <DistrictManager />
            </TabsContent>

            {canManageUsers && (
              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          จัดการบัญชีผู้ใช้งาน
                        </CardTitle>
                        <CardDescription className="flex items-start gap-2 text-xs sm:text-sm">
                          <Shield className="mt-0.5 h-4 w-4 text-primary/80" />
                          <span>
                            ผู้ดูแลระบบสามารถปรับบทบาท ระงับ หรือเปลี่ยนรหัสผ่านให้ทุกบัญชีได้
                            ส่วนเจ้าหน้าที่ดูแลข้อมูลพื้นฐาน ปรับชื่อ และเปลี่ยนรหัสผ่านของตนเองได้
                            แต่ไม่สามารถลบบัญชี ปรับบทบาท หรือเปลี่ยนสถานะของผู้อื่นได้
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 shrink-0"
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          รออนุมัติ {usersData?.pendingCount ?? 0} ราย
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2 shrink-0"
                          onClick={() =>
                            queryClient.invalidateQueries({
                              queryKey: ["admin-users"],
                            })
                          }
                          disabled={usersQuery.isFetching}
                        >
                          {usersQuery.isFetching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span className="sr-only">รีเฟรชรายชื่อผู้ใช้</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          บทบาท
                        </Label>
                        <Select
                          value={userFilters.role || ALL_ROLE_VALUE}
                          onValueChange={(value) =>
                            setUserFilters((prev) => ({
                              ...prev,
                              role: value === ALL_ROLE_VALUE ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="ทั้งหมด" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_ROLE_VALUE}>
                              ทั้งหมด
                            </SelectItem>
                            {roleOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                          สถานะ
                        </Label>
                        <Select
                          value={userFilters.status || ALL_STATUS_VALUE}
                          onValueChange={(value) =>
                            setUserFilters((prev) => ({
                              ...prev,
                              status: value === ALL_STATUS_VALUE ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="ทั้งหมด" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_STATUS_VALUE}>
                              ทั้งหมด
                            </SelectItem>
                            {statusOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          คำค้นหา
                        </Label>
                        <Input
                          value={userFilters.search}
                          onChange={(event) =>
                            setUserFilters((prev) => ({
                              ...prev,
                              search: event.target.value,
                            }))
                          }
                          placeholder="ค้นหาด้วยชื่อผู้ใช้ หรือชื่อ-นามสกุล"
                        />
                      </div>
                    </div>

                    {showUsersRefreshing ? (
                      <p className="text-sm text-muted-foreground">
                        กำลังอัปเดตข้อมูลผู้ใช้...
                      </p>
                    ) : usersData && usersData.users.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-2 text-left text-xs font-medium uppercase tracking-wide">
                                  <span className="flex items-center gap-2">
                                    <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    ผู้ใช้งาน
                                  </span>
                                </th>
                                <th className="p-2 text-left text-xs font-medium uppercase tracking-wide">
                                  <span className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    พื้นที่
                                  </span>
                                </th>
                                <th className="p-2 text-left text-xs font-medium uppercase tracking-wide">
                                  <span className="flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                    บทบาท
                                  </span>
                                </th>
                                <th className="p-2 text-left text-xs font-medium uppercase tracking-wide">
                                  <span className="flex items-center gap-2">
                                    <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                    สถานะ
                                  </span>
                                </th>
                                <th className="p-2 text-left text-xs font-medium uppercase tracking-wide">
                                  <span className="flex items-center gap-2">
                                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                                    ล่าสุด
                                  </span>
                                </th>
                                <th className="p-2 text-right text-xs font-medium uppercase tracking-wide">
                                  <span className="flex items-center justify-end gap-2">
                                    <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                                    การจัดการ
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                              {usersData.users.map((account) => {
                                const isSelf = user?.id === account.id;
                                const roleLabel =
                                  userRoleLabels[account.role] ?? account.role;
                                const statusLabel =
                                  userStatusLabels[account.status] ??
                                  account.status;
                                const originalName = account.name ?? "";
                                const nameDraft =
                                  userNameDrafts[account.id] ?? originalName;
                                const trimmedDraftName = nameDraft.trim();
                                const trimmedOriginalName =
                                  originalName.trim();
                                const nameHasChanged =
                                  trimmedDraftName !== trimmedOriginalName;
                                const canEditName = isAdmin || isSelf;
                                const canEditThisRole =
                                  canEditUserRole && !isSelf;
                                const canEditThisStatus =
                                  canEditUserStatus && !isSelf;
                                const canApproveAccount =
                                  canApproveUsers &&
                                  account.status === "pending" &&
                                  !isSelf;
                                const canChangeAccountPassword =
                                  isAdmin || isSelf;
                                const handleNameSave = () => {
                                  if (!trimmedDraftName) {
                                    toast.error("กรุณาระบุชื่อผู้ใช้งาน");
                                    return;
                                  }
                                  updateUserMutation.mutate(
                                    { id: account.id, name: trimmedDraftName },
                                    {
                                      onSuccess: () => {
                                        setUserNameDrafts((prev) => {
                                          const next = { ...prev };
                                          delete next[account.id];
                                          return next;
                                        });
                                      },
                                    }
                                  );
                                };
                                return (
                                  <tr
                                    key={account.id}
                                    className="hover:bg-muted/50"
                                  >
                                    <td className="p-2">
                                      <div className="flex flex-col gap-1">
                                        {canEditName ? (
                                          <>
                                            <Input
                                              value={nameDraft}
                                              onChange={(event) =>
                                                setUserNameDrafts((prev) => ({
                                                  ...prev,
                                                  [account.id]:
                                                    event.target.value,
                                                }))
                                              }
                                              placeholder="ระบุชื่อผู้ใช้งาน"
                                              disabled={updateUserMutation.isPending}
                                              className="h-9"
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs text-muted-foreground">
                                                @{account.username}
                                              </span>
                                              {nameHasChanged ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="flex h-7 items-center gap-2 px-2"
                                                  onClick={handleNameSave}
                                                  disabled={
                                                    updateUserMutation.isPending
                                                  }
                                                >
                                                  {updateUserMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <Check className="h-4 w-4" />
                                                  )}
                                                  <span className="text-xs font-medium">
                                                    บันทึกชื่อ
                                                  </span>
                                                </Button>
                                              ) : null}
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <span className="font-medium">
                                              {account.name || "-"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              @{account.username}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      {account.district || "ทั้งหมด"}
                                    </td>
                                    <td className="p-2">
                                      {canEditThisRole ? (
                                        <Select
                                          value={account.role}
                                          onValueChange={(value) =>
                                            updateUserMutation.mutate({
                                              id: account.id,
                                              role: value as UserRole,
                                            })
                                          }
                                          disabled={updateUserMutation.isPending}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {roleOptions.map((option) => (
                                              <SelectItem
                                                key={option.value}
                                                value={option.value}
                                              >
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="inline-flex items-center gap-1 px-2 py-1"
                                        >
                                          <Shield className="h-3 w-3 text-muted-foreground" />
                                          {roleLabel}
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {canEditThisStatus ? (
                                        <Select
                                          value={account.status}
                                          onValueChange={(value) =>
                                            updateUserMutation.mutate({
                                              id: account.id,
                                              status: value as UserStatus,
                                            })
                                          }
                                          disabled={updateUserMutation.isPending}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {statusOptions.map((option) => (
                                              <SelectItem
                                                key={option.value}
                                                value={option.value}
                                              >
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="inline-flex items-center gap-1 px-2 py-1"
                                        >
                                          <BadgeCheck className="h-3 w-3 text-muted-foreground" />
                                          {statusLabel}
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-2 text-xs text-muted-foreground">
                                      {account.lastLogin
                                        ? new Date(
                                            account.lastLogin
                                          ).toLocaleString()
                                        : "-"}
                                    </td>
                                    <td className="p-2">
                                      <div className="flex justify-end gap-2">
                                        {canApproveAccount && (
                                          <Button
                                            size="sm"
                                            className="flex items-center gap-2"
                                            onClick={() =>
                                              approveUserMutation.mutate({
                                                id: account.id,
                                              })
                                            }
                                            disabled={
                                              approveUserMutation.isPending
                                            }
                                            variant="outline"
                                            >
                                            {approveUserMutation.isPending ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <UserCheck className="w-4 h-4" />
                                            )}
                                            <span>อนุมัติ</span>
                                          </Button>
                                        )}
                                        {canChangeAccountPassword && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex items-center gap-2"
                                            onClick={() => {
                                              setPasswordDialogAccount(account);
                                              resetPasswordForm();
                                            }}
                                            disabled={
                                              changePasswordMutation.isPending
                                            }
                                          >
                                            {changePasswordMutation.isPending ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <KeyRound className="w-4 h-4" />
                                            )}
                                            <span>เปลี่ยนรหัสผ่าน</span>
                                          </Button>
                                        )}
                                        {!canApproveAccount &&
                                          !canChangeAccountPassword && (
                                            <span className="text-xs text-muted-foreground">
                                              ไม่มีสิทธิ์จัดการ
                                            </span>
                                          )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-4 text-xs text-muted-foreground space-y-2">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Info className="h-4 w-4 text-primary" />
                            แนวทางการจัดการบัญชี
                          </div>
                          <p className="flex items-start gap-2">
                            <Shield className="mt-0.5 h-4 w-4 text-primary/80" />
                            <span>
                              ผู้ดูแลระบบ: ปรับบทบาท เปลี่ยนสถานะ
                              ระงับบัญชี และเปลี่ยนรหัสผ่านให้ทุกคนได้ครบถ้วน
                            </span>
                          </p>
                          <p className="flex items-start gap-2">
                            <UserCog className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <span>
                              เจ้าหน้าที่: ตรวจสอบและแก้ไขข้อมูลพื้นฐานได้
                              พร้อมปรับชื่อและเปลี่ยนรหัสผ่านของตนเอง แต่ไม่สามารถลบบัญชี
                              หรือเปลี่ยนบทบาทและสถานะผู้อื่นได้
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            แสดงหน้า {usersPage.toLocaleString()}
                            {usersTotalPages
                              ? ` จาก ${usersTotalPages.toLocaleString()}`
                              : ""}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setUsersPage((previous) =>
                                  Math.max(1, previous - 1)
                                )
                              }
                              disabled={
                                usersPage === 1 || usersQuery.isFetching
                              }
                            >
                              ก่อนหน้า
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setUsersPage((previous) => previous + 1)
                              }
                              disabled={!usersHasMore || usersQuery.isFetching}
                            >
                              ถัดไป
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        ไม่มีข้อมูลผู้ใช้ตามเงื่อนไขที่เลือก
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
        <Dialog
          open={isPasswordDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (changePasswordMutation.isPending) {
                return;
              }
              closePasswordDialog();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                เปลี่ยนรหัสผ่าน
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                กำหนดรหัสผ่านใหม่สำหรับ{" "}
                <span className="font-medium text-foreground">
                  {passwordDialogTargetName || "ผู้ใช้งาน"}
                </span>
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              {passwordDialogRequiresCurrentPassword ? (
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                    disabled={changePasswordMutation.isPending}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  disabled={changePasswordMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {PASSWORD_POLICY_MESSAGE}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  disabled={changePasswordMutation.isPending}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePasswordDialog}
                  disabled={changePasswordMutation.isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  <span>บันทึกรหัสผ่าน</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Admin;
