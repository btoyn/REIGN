/**
 * Telling a database that is missing a table from one that cannot be reached.
 *
 * REIGN's migrations are run by hand, in Supabase, by the owner. So there is a
 * window between a feature shipping and its table existing, and in that window
 * every read of it fails. The screens used to report that as "check your
 * connection", which is the one thing it is not: the connection is fine, the
 * table is simply not there yet, and no amount of retrying or moving nearer the
 * router will change it.
 *
 * Getting that wrong is not a small cosmetic thing. The owner is not a
 * developer, and an error naming the wrong cause sends them looking in the
 * wrong place — which has already cost this project an evening once, over a
 * Shortcut that said a workout could not be logged when the real problem was a
 * blank Distance field.
 */

/**
 * PostgREST's two ways of saying a table is not there.
 *
 * PGRST205 is its own: it looked in the schema cache and found nothing by that
 * name. 42P01 is Postgres' "relation does not exist", which comes back when the
 * request reaches the database itself. Either one means the same thing to the
 * owner, so both are one condition here.
 */
const NO_SUCH_TABLE = new Set(["PGRST205", "42P01"]);

/**
 * A table the app expects that the database does not have.
 *
 * Carries the table name so a screen can name it, and is its own type so a
 * screen can tell it apart from a failure worth retrying without reading error
 * text and guessing.
 */
export class TableNotThere extends Error {
  readonly table: string;

  constructor(table: string) {
    super(`the ${table} table is not in the database`);
    this.name = "TableNotThere";
    this.table = table;
  }
}

/** Whether a caught failure is a missing table, whatever else it might be. */
export function isTableNotThere(e: unknown): e is TableNotThere {
  return e instanceof TableNotThere;
}

/**
 * Turn a PostgREST error into the right kind of thrown error.
 *
 * Always throws. Written this way so a caller reads
 * `if (error) fail(error, "bodyweight");` and carries on with data it now
 * knows is there, rather than restating the same two branches at every read.
 */
export function fail(
  error: { code?: string | null; message: string },
  table: string,
): never {
  if (error.code && NO_SUCH_TABLE.has(error.code)) {
    throw new TableNotThere(table);
  }
  throw new Error(error.message);
}
