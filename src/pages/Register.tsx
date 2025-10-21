import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { googleSheetsApi } from "@/services/googleSheetsApi";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { LoadingState } from "@/components/LoadingState";
import { getCombinedQueryState } from "@/lib/queryState";

const FALLBACK_DISTRICTS = [
  "เมืองแพร่",
  "สอง",
  "เด่นชัย",
  "ลอง",
  "สูงเม่น",
  "วังชิ้น",
  "ร้องกวาง",
  "หนองม่วงไข่",
];

const Register = () => {
  const navigate = useNavigate();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      district: "",
    },
  });

  const districtsQuery = useQuery({
    queryKey: ["districts"],
    queryFn: () => googleSheetsApi.getDistricts(),
  });

  const { isInitialLoading: isLoadingDistricts, isRefreshing: isRefreshingDistricts } =
    getCombinedQueryState([districtsQuery]);

  const districtOptions = useMemo(() => {
    const mapping = districtsQuery.data;
    if (mapping) {
      const names = Object.keys(mapping);
      if (names.length > 0) {
        return names;
      }
    }
    return FALLBACK_DISTRICTS;
  }, [districtsQuery.data]);

  const onSubmit = async (values: RegisterFormData) => {
    try {
      const result = await googleSheetsApi.register({
        username: values.username.trim(),
        password: values.password,
        name: values.name.trim(),
        district: values.district,
      });

      if (result.success) {
        toast.success(result.message || "สมัครสมาชิกสำเร็จ! รอการอนุมัติจาก Admin");
        form.reset();
        setTimeout(() => navigate("/login"), 1500);
      } else {
        toast.error(result.message || "ไม่สามารถสมัครสมาชิกได้");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error("เกิดข้อผิดพลาดในการสมัครสมาชิก");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">สมัครสมาชิก</CardTitle>
          <CardDescription>ลงทะเบียนเพื่อเข้าใช้งานระบบ NCDs Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDistricts ? (
            <LoadingState
              message="กำลังโหลดรายชื่ออำเภอ..."
              className="py-4"
            />
          ) : null}
          {!isLoadingDistricts && isRefreshingDistricts ? (
            <p className="mb-4 text-xs text-muted-foreground text-center">
              กำลังอัปเดตรายชื่ออำเภอ...
            </p>
          ) : null}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ใช้งาน</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ตัวอย่าง: phrae_song"
                        {...field}
                        autoComplete="username"
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ระบุชื่อ-นามสกุล"
                        {...field}
                        autoComplete="name"
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อำเภอที่รับผิดชอบ</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={form.formState.isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกอำเภอ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districtOptions.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="อย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ"
                        {...field}
                        autoComplete="new-password"
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      ตัวอย่างเช่น <span className="font-mono">Phrae@2568</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ยืนยันรหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                        {...field}
                        autoComplete="new-password"
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate("/login")}
                >
                  เข้าสู่ระบบ
                </Button>
              </div>

              <div className="pt-4 border-t text-xs text-muted-foreground text-center">
                หมายเหตุ: บัญชีจะต้องได้รับการอนุมัติจากผู้ดูแลระบบก่อนจึงจะสามารถเข้าใช้งานได้
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
