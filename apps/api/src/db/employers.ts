import { sql } from './client.js';

export type EmployerRow = {
  id: string;
  name: string;
};

export const listActiveEmployers = async (): Promise<EmployerRow[]> => {
  const rows = await sql`
    SELECT id, name
    FROM employers
    WHERE active = TRUE
    ORDER BY name ASC
  `;

  return rows as EmployerRow[];
};
