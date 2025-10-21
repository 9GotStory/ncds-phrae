import { z } from "zod";

const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE =
  "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ";

// Login validation
export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(50, "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร")
    .trim(),
  password: z
    .string()
    .min(8, PASSWORD_POLICY_MESSAGE)
    .max(100, "รหัสผ่านต้องไม่เกิน 100 ตัวอักษร"),
});

// Register validation
export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
      .max(50, "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร")
      .regex(/^[a-zA-Z0-9_]+$/, "ชื่อผู้ใช้ต้องเป็นตัวอักษร ตัวเลข หรือ _ เท่านั้น")
      .trim(),
    password: z
      .string()
      .max(100, "รหัสผ่านต้องไม่เกิน 100 ตัวอักษร")
      .regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string(),
    name: z
      .string()
      .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
      .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร")
      .trim(),
    district: z.string().min(1, "กรุณาเลือกอำเภอ"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

// NCDs Data validation
export const ncdDataSchema = z.object({
  district: z.string().min(1, 'กรุณาเลือกอำเภอ'),
  subdistrict: z.string().min(1, 'กรุณาเลือกตำบล'),
  village: z.string().min(1, 'กรุณาเลือกหมู่บ้าน'),
  monthYear: z.string().min(1, 'กรุณาเลือกเดือน/ปี'),
  hypertension: z.object({
    normal: z.number().min(0, 'ต้องเป็นตัวเลขที่ไม่ติดลบ').int('ต้องเป็นจำนวนเต็ม'),
    risk: z.number().min(0, 'ต้องเป็นตัวเลขที่ไม่ติดลบ').int('ต้องเป็นจำนวนเต็ม'),
    ill: z.number().min(0, 'ต้องเป็นตัวเลขที่ไม่ติดลบ').int('ต้องเป็นจำนวนเต็ม'),
  }),
  diabetes: z.object({
    normal: z.number().min(0).int(),
    risk: z.number().min(0).int(),
    ill: z.number().min(0).int(),
  }),
  obesity: z.object({
    normal: z.number().min(0).int(),
    risk: z.number().min(0).int(),
    ill: z.number().min(0).int(),
  }),
  copd: z.object({
    normal: z.number().min(0).int(),
    risk: z.number().min(0).int(),
    ill: z.number().min(0).int(),
  }),
  cvd: z.object({
    normal: z.number().min(0).int(),
    risk: z.number().min(0).int(),
    ill: z.number().min(0).int(),
  }),
  ckd: z.object({
    normal: z.number().min(0).int(),
    risk: z.number().min(0).int(),
    ill: z.number().min(0).int(),
  }),
  referrals: z.number().min(0, 'ต้องเป็นตัวเลขที่ไม่ติดลบ').int('ต้องเป็นจำนวนเต็ม'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type NCDFormData = z.infer<typeof ncdDataSchema>;
