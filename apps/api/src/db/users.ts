import { sql } from './client.js';

export type UserRow = {
  id: string;
  name: string;
};

export const listActiveUsers = async (): Promise<UserRow[]> => {
  const rows = await sql`
    SELECT id, name
    FROM users
    WHERE active = TRUE
    ORDER BY name ASC
  `;

  return rows as UserRow[];
};
