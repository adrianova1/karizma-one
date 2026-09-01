/**
 * Database compatibility module (Mock / In-memory for standalone JSON architecture)
 */

export function isPostgresConfigured(): boolean {
  return false;
}

const noOp = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: any) => d?.data ?? {},
  update: async (d: any) => d?.data ?? {},
  delete: async () => ({})
};

export const db: any = new Proxy({}, {
  get: (_, prop) => prop === 'query'
    ? new Proxy({}, { get: () => noOp })
    : async () => [],
});
