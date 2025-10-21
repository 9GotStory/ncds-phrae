import { describe, expect, it } from 'vitest';

import { registerSchema } from './validations';

describe('registerSchema', () => {
  it('accepts a valid payload', () => {
    const payload = {
      username: 'tester01',
      password: 'Secure@123',
      confirmPassword: 'Secure@123',
      name: 'ทดสอบ ระบบ',
      district: 'เมืองแพร่',
    };

    const result = registerSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects passwords that do not meet the policy', () => {
    const payload = {
      username: 'tester02',
      password: 'plaintext',
      confirmPassword: 'plaintext',
      name: 'ทดสอบ ระบบ',
      district: 'สอง',
    };

    const result = registerSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

