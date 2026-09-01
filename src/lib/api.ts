/**
 * Safe API request utility with resilient JSON parsing and error handling.
 * Prevents "Unexpected token '<', '<!doctype '... is not valid JSON" errors.
 */

export async function parseSafeJson<T = any>(res: Response, fallback: T | null = null): Promise<T | null> {
  try {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text().catch(() => '');
    if (!text || text.startsWith('<!doctype') || text.startsWith('<html') || text.trim().startsWith('<')) {
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ data: T | null; error: string | null; status: number; ok: boolean }> {
  try {
    const res = await fetch(input, init);
    const status = res.status;
    const ok = res.ok;

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text().catch(() => '');
    
    if (text.startsWith('<!doctype') || text.startsWith('<html') || text.trim().startsWith('<')) {
      return {
        data: null,
        error: ok ? null : `پاسخ سرور در قالب نامعتبر دریافت شد (${status})`,
        status,
        ok: false
      };
    }

    try {
      const parsed = JSON.parse(text);
      if (!ok) {
        return {
          data: parsed,
          error: parsed?.error || `خطای سرور (${status})`,
          status,
          ok: false
        };
      }
      return { data: parsed, error: null, status, ok: true };
    } catch {
      return {
        data: null,
        error: ok ? null : `خطای ناشناخته در دریافت اطلاعات (${status})`,
        status,
        ok: false
      };
    }
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'خطا در برقراری ارتباط با سرور',
      status: 0,
      ok: false
    };
  }
}

