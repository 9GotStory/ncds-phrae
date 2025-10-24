import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivitySquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
  googleSheetsApi,
  type DistrictEntry,
  type SaveDistrictEntryPayload,
} from "@/services/googleSheetsApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/useAuth";
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

const districtEntrySchema = z.object({
  id: z.string().optional(),
  districtCode: z.string().optional(),
  districtName: z.string().trim().min(1, "กรุณาระบุชื่ออำเภอ"),
  subdistrictCode: z.string().optional(),
  subdistrictName: z.string().trim().min(1, "กรุณาระบุชื่อตำบล"),
  villageName: z.string().trim().min(1, "กรุณาระบุชื่อหมู่บ้าน"),
  moo: z.string().trim().min(1, "กรุณาระบุหมู่"),
  population: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Number(value)),
      "กรุณาระบุจำนวนประชากรเป็นตัวเลข"
    )
    .refine(
      (value) => !value || Number(value) >= 0,
      "จำนวนประชากรต้องไม่เป็นค่าลบ"
    ),
});

type DistrictEntryFormValues = z.infer<typeof districtEntrySchema>;

const getDefaultDistrictEntryValues = (
  overrides: Partial<DistrictEntryFormValues> = {}
): DistrictEntryFormValues => ({
  id: "",
  districtCode: "",
  districtName: "",
  subdistrictCode: "",
  subdistrictName: "",
  villageName: "",
  moo: "",
  population: "",
  ...overrides,
});

export const DistrictManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "admin";
  const userDistrict = user?.district?.trim() ?? "";
  const hasDistrictAccess = isAdmin || userDistrict.length > 0;
  const districtFilter = isAdmin ? undefined : userDistrict || undefined;

  const form = useForm<DistrictEntryFormValues>({
    resolver: zodResolver(districtEntrySchema),
    defaultValues: getDefaultDistrictEntryValues(
      !isAdmin && userDistrict
        ? {
            districtName: userDistrict,
          }
        : undefined
    ),
  });

  const formIdValue = form.watch("id");
  const isEditing = useMemo(() => !!formIdValue, [formIdValue]);

  useEffect(() => {
    if (!isAdmin && userDistrict && !isEditing) {
      form.setValue("districtName", userDistrict);
    }
  }, [form, isAdmin, isEditing, userDistrict]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const districtEntriesQuery = useQuery({
    queryKey: ["district-entries", districtFilter ?? "__all__", search, page],
    queryFn: (): Promise<import("@/services/googleSheetsApi").DistrictEntriesResponse> =>
      googleSheetsApi.getDistrictEntries({
        district: districtFilter,
        search: search || undefined,
        page,
        limit: 20,
      }),
    enabled: hasDistrictAccess,
  });

  const saveDistrictMutation = useMutation({
    mutationFn: (payload: SaveDistrictEntryPayload) =>
      googleSheetsApi.saveDistrictEntry(payload),
    onSuccess: (result, variables) => {
      const synced = result.syncedRecords;
      let successMessage = result.message || "บันทึกข้อมูลพื้นที่เรียบร้อย";
      if (synced && synced.totalUpdated > 0) {
        const details: string[] = [];
        if (synced.generalUpdated > 0) {
          details.push(
            `บุคคลทั่วไป ${synced.generalUpdated.toLocaleString()} รายการ`
          );
        }
        if (synced.monkUpdated > 0) {
          details.push(`พระสงฆ์ ${synced.monkUpdated.toLocaleString()} รายการ`);
        }
        const suffix =
          details.length > 0
            ? ` (อัปเดตข้อมูล ${details.join(" และ ")})`
            : ` (อัปเดตข้อมูล ${synced.totalUpdated.toLocaleString()} รายการ)`;
        successMessage = `${successMessage}${suffix}`;
      }
      toast.success(successMessage);
      if (result.districts) {
        queryClient.setQueryData(["district-mapping"], result.districts);
      } else {
        queryClient.invalidateQueries({ queryKey: ["district-mapping"] });
      }
      queryClient.invalidateQueries({ queryKey: ["district-entries"] });
      form.reset(
        getDefaultDistrictEntryValues(
          !isAdmin && userDistrict
            ? {
                districtName: userDistrict,
              }
            : undefined
        )
      );
      if (!variables.id) {
        setPage(1);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteDistrictMutation = useMutation({
    mutationFn: (id: string) => googleSheetsApi.deleteDistrictEntry(id),
    onSuccess: (result, id) => {
      toast.success(result.message);
      if (result.districts) {
        queryClient.setQueryData(["district-mapping"], result.districts);
      } else {
        queryClient.invalidateQueries({ queryKey: ["district-mapping"] });
      }
      queryClient.invalidateQueries({ queryKey: ["district-entries"] });
      if (form.getValues("id") === id) {
        form.reset(
          getDefaultDistrictEntryValues(
            !isAdmin && userDistrict
              ? {
                  districtName: userDistrict,
                }
              : undefined
          )
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const entries = districtEntriesQuery.data?.entries ?? [];
  const totalEntries = districtEntriesQuery.data?.total ?? 0;
  const limit = districtEntriesQuery.data?.limit ?? 20;
  const hasMore = districtEntriesQuery.data?.hasMore ?? false;
  const isLoading =
    districtEntriesQuery.isLoading && !districtEntriesQuery.data;
  const isRefreshing =
    districtEntriesQuery.isFetching && !!districtEntriesQuery.data;

  const handleEdit = (entry: DistrictEntry) => {
    if (!isAdmin && entry.districtName.trim() !== userDistrict) {
      toast.error("คุณสามารถแก้ไขข้อมูลของอำเภอของตนเองเท่านั้น");
      return;
    }

    form.reset({
      id: entry.id,
      districtCode: entry.districtCode,
      districtName: entry.districtName,
      subdistrictCode: entry.subdistrictCode,
      subdistrictName: entry.subdistrictName,
      villageName: entry.villageName,
      moo: entry.moo,
      population:
        entry.population !== null && entry.population !== undefined
          ? String(entry.population)
          : "",
    });

    const targetName = entry.subdistrictName || entry.districtName || "";
    if (targetName.trim().length > 0) {
      toast.success(`โหลดข้อมูล "${targetName}" สำหรับแก้ไขแล้ว`);
    } else {
      toast.success("โหลดข้อมูลสำหรับแก้ไขแล้ว");
    }
  };

  const handleDelete = (entry: DistrictEntry) => {
    if (!isAdmin && entry.districtName.trim() !== userDistrict) {
      toast.error("คุณสามารถลบข้อมูลของอำเภอของตนเองเท่านั้น");
      return;
    }

    if (deleteDistrictMutation.isPending) {
      return;
    }
    deleteDistrictMutation.mutate(entry.id);
  };

  const onSubmit = (values: DistrictEntryFormValues) => {
    if (!isAdmin && userDistrict && values.districtName.trim() !== userDistrict) {
      toast.error("กรุณาบันทึกข้อมูลเฉพาะในอำเภอของตนเองเท่านั้น");
      return;
    }

    const normalizedDistrictName = isAdmin ? values.districtName.trim() : userDistrict;

    const payload: SaveDistrictEntryPayload = {
      id: values.id || undefined,
      districtCode: values.districtCode?.trim() || undefined,
      districtName: normalizedDistrictName,
      subdistrictCode: values.subdistrictCode?.trim() || undefined,
      subdistrictName: values.subdistrictName,
      villageName: values.villageName,
      moo: values.moo,
      population:
        values.population && values.population.trim() !== ""
          ? Math.round(Number(values.population))
          : null,
    };

    saveDistrictMutation.mutate(payload);
  };

  const handleResetForm = () => {
    form.reset(
      getDefaultDistrictEntryValues(
        !isAdmin && userDistrict
          ? {
              districtName: userDistrict,
            }
          : undefined
      )
    );
  };

  const primaryActionLabel = isEditing ? "บันทึก" : "เพิ่ม";
  const primaryActionIcon = saveDistrictMutation.isPending ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : isEditing ? (
    <Save className="h-4 w-4" />
  ) : (
    <Plus className="h-4 w-4" />
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <ActivitySquare className="h-5 w-5 text-primary" />
              จัดการข้อมูลตำบล
            </CardTitle>
            <CardDescription>
              บริหารข้อมูลตำบลและชุมชนให้สอดคล้องกับการบันทึกและวิเคราะห์ NCD
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 sm:w-auto w-full sm:self-auto self-stretch"
            onClick={() => districtEntriesQuery.refetch()}
            disabled={districtEntriesQuery.isFetching}
          >
            {districtEntriesQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">รีเฟรชข้อมูลตำบล</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasDistrictAccess ? (
          <p className="text-sm text-muted-foreground">
            ไม่พบข้อมูลอำเภอของคุณ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึงการจัดการข้อมูลตำบล
          </p>
        ) : (
          <form
            className="grid gap-6 lg:grid-cols-[320px,1fr]"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <input type="hidden" {...form.register("districtCode")} />
            <input type="hidden" {...form.register("subdistrictCode")} />
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">
                {isEditing ? "แก้ไขข้อมูลตำบล" : "เพิ่มข้อมูลตำบล"}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="districtName">อำเภอ *</Label>
                <Input
                  id="districtName"
                  placeholder="เช่น อำเภอเมือง"
                  readOnly={!isAdmin}
                  {...form.register("districtName")}
                />
                {form.formState.errors.districtName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.districtName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subdistrictName">ตำบล *</Label>
                <Input
                  id="subdistrictName"
                  placeholder="เช่น ตำบลเมือง"
                  {...form.register("subdistrictName")}
                />
                {form.formState.errors.subdistrictName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.subdistrictName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="villageName">หมู่บ้าน *</Label>
                <Input
                  id="villageName"
                  placeholder="ชื่อหมู่บ้าน"
                  {...form.register("villageName")}
                />
                {form.formState.errors.villageName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.villageName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="moo">หมู่ *</Label>
                <Input
                  id="moo"
                  placeholder="เช่น 1 หรือ 3/1"
                  {...form.register("moo")}
                />
                {form.formState.errors.moo ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.moo.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="population">จำนวนประชากร</Label>
                <Input
                  id="population"
                  placeholder="ตัวเลข (ถ้ามี)"
                  inputMode="numeric"
                  {...form.register("population")}
                />
                {form.formState.errors.population ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.population.message}
                  </p>
                ) : null}
              </div>

            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                className="gap-2 sm:w-auto w-full justify-center"
                disabled={saveDistrictMutation.isPending}
              >
                {primaryActionIcon}
                <span>{primaryActionLabel}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                disabled={saveDistrictMutation.isPending}
                className="sm:w-auto w-full justify-center"
              >
                <Undo2 className="h-4 w-4" />
                <span className="sr-only">ล้างแบบฟอร์ม</span>
              </Button>
            </div>

            {isEditing ? (
              <Badge variant="outline" className="w-full justify-center">
                กำลังแก้ไขข้อมูล ID {formIdValue}
              </Badge>
            ) : null}
            </div>

            <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full items-center gap-2 sm:max-w-xl">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="ค้นหาอำเภอ ตำบล หรือหมู่บ้าน"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Badge variant="secondary" className="justify-center">
                  ทั้งหมด {totalEntries.toLocaleString()} รายการ
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>อำเภอ</TableHead>
                    <TableHead>ตำบล</TableHead>
                    <TableHead>หมู่บ้าน</TableHead>
                    <TableHead className="w-[70px]">หมู่</TableHead>
                    <TableHead className="w-[120px] text-right">
                      ประชากร
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>กำลังโหลดข้อมูลตำบล...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        ไม่พบข้อมูลตำบลที่ค้นหา
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {entry.districtName || "-"}
                        </TableCell>
                        <TableCell>{entry.subdistrictName || "-"}</TableCell>
                        <TableCell>{entry.villageName || "-"}</TableCell>
                        <TableCell>{entry.moo || "-"}</TableCell>
                        <TableCell className="text-right">
                          {entry.population !== null && entry.population !== undefined
                            ? entry.population.toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="inline-flex items-center justify-center"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">แก้ไขรายการ</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    โหลดข้อมูลเพื่อแก้ไข?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {`ต้องการเปิด "${entry.subdistrictName || entry.districtName || "รายการนี้"}" ในฟอร์มเพื่อแก้ไขหรือไม่?`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleEdit(entry)}>
                                    ยืนยัน
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={deleteDistrictMutation.isPending}
                                  className="inline-flex items-center justify-center"
                                >
                                  {deleteDistrictMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">ลบรายการ</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ยืนยันการลบข้อมูล

                                  </AlertDialogTitle>

                                  <AlertDialogDescription>

                                    {`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล "${entry.subdistrictName || entry.districtName || "รายการนี้"}"? การลบไม่สามารถย้อนกลับได้`}

                                  </AlertDialogDescription>

                                </AlertDialogHeader>

                                <AlertDialogFooter>

                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>

                                  <AlertDialogAction

                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"

                                    onClick={() => handleDelete(entry)}

                                    disabled={deleteDistrictMutation.isPending}

                                  >

                                    ยืนยันการลบ

                                  </AlertDialogAction>

                                </AlertDialogFooter>

                              </AlertDialogContent>

                            </AlertDialog>

                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {isRefreshing ? (
              <p className="text-center text-sm text-muted-foreground">
                กำลังอัปเดตข้อมูลตำบลใหม่...
              </p>
            ) : null}

            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div>
                หน้า {page.toLocaleString()}
                {districtEntriesQuery.data
                  ? ` / ${Math.max(
                      1,
                      Math.ceil(totalEntries / limit)
                    ).toLocaleString()}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={page === 1 || districtEntriesQuery.isFetching}
                  className="inline-flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">หน้าก่อน</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={!hasMore || districtEntriesQuery.isFetching}
                  className="inline-flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">หน้าถัดไป</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  );
};

export default DistrictManager;
