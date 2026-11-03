// In-memory stand-in for the Supabase query builder used by the coach
// actions tests: filters (eq/neq/ilike/in), reads (maybeSingle/single/await)
// and writes (insert/update/upsert/delete) on plain arrays, recording every
// write so tests can assert on it.

type Row = Record<string, unknown>;

export type FakeDb = {
  tables: Record<string, Row[]>;
  writes: { table: string; op: string; value?: unknown }[];
  insertError: { code: string; message: string } | null;
  from: (table: string) => unknown;
};

export function createFakeDb(): FakeDb {
  const db: FakeDb = {
    tables: {},
    writes: [],
    insertError: null,
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = [];
      let op: 'select' | 'update' | 'delete' | 'insert' = 'select';
      let payload: Row | null = null;
      const rows = () => (db.tables[table] ??= []);
      const matching = () => rows().filter((r) => filters.every((f) => f(r)));

      const run = () => {
        if (op === 'update') {
          const hit = matching();
          hit.forEach((r) => Object.assign(r, payload));
          db.writes.push({
            table,
            op,
            value: { ...payload, count: hit.length },
          });
          return { data: hit, error: null };
        }
        if (op === 'delete') {
          const hit = matching();
          db.tables[table] = rows().filter((r) => !hit.includes(r));
          db.writes.push({ table, op, value: hit.length });
          return { data: hit, error: null };
        }
        return { data: matching(), error: null };
      };

      const builder = {
        select: () => builder,
        eq: (k: string, v: unknown) => {
          filters.push((r) => r[k] === v);
          return builder;
        },
        neq: (k: string, v: unknown) => {
          filters.push((r) => r[k] !== v);
          return builder;
        },
        ilike: (k: string, v: string) => {
          const plain = v.replace(/\\([\\%_])/g, '$1').toLowerCase();
          filters.push((r) => String(r[k]).toLowerCase() === plain);
          return builder;
        },
        in: (k: string, vs: unknown[]) => {
          filters.push((r) => vs.includes(r[k]));
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        insert: (value: Row) => {
          op = 'insert';
          db.writes.push({ table, op, value });
          if (!db.insertError) rows().push({ id: 'new-id', ...value });
          return builder;
        },
        upsert: (value: Row) => {
          db.writes.push({ table, op: 'upsert', value });
          return builder;
        },
        update: (value: Row) => {
          op = 'update';
          payload = value;
          return builder;
        },
        delete: () => {
          op = 'delete';
          return builder;
        },
        maybeSingle: async () => {
          const { data } = run();
          return { data: data[0] ?? null, error: null };
        },
        single: async () => {
          if (op === 'insert') {
            return db.insertError
              ? { data: null, error: db.insertError }
              : { data: { id: 'new-id' }, error: null };
          }
          const { data } = run();
          return {
            data: data[0] ?? null,
            error: data[0] ? null : { code: 'PGRST116' },
          };
        },
        then: (resolve: (v: unknown) => void) =>
          resolve(op === 'insert' ? { error: db.insertError } : run()),
      };
      return builder;
    },
  };
  return db;
}
