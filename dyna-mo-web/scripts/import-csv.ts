import Database from "better-sqlite3";
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";

import {
  integerColumns,
  numberColumns,
  systemColumns,
  systemRowSchema,
  textColumns,
  type SystemRow,
} from "../src/lib/schema";

type CsvRecord = Record<string, string>;

const projectRoot = process.cwd();
const passCsv = path.resolve(
  projectRoot,
  process.argv[2] ?? "data/master_table_all_pass.csv",
);
const allCsv = path.resolve(
  projectRoot,
  process.argv[3] ?? "data/master_table_all.csv",
);
const dbFile = path.resolve(
  projectRoot,
  process.env.DYNA_MO_DB_PATH ?? "data/dyna_mo.sqlite",
);

function columnType(column: string) {
  if (integerColumns.includes(column as (typeof integerColumns)[number])) {
    return "INTEGER";
  }

  if (numberColumns.includes(column as (typeof numberColumns)[number])) {
    return "REAL";
  }

  if (textColumns.includes(column as (typeof textColumns)[number])) {
    return "TEXT";
  }

  throw new Error(`Unknown column: ${column}`);
}

function readRows(csvPath: string) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, "utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as CsvRecord[];

  const missingColumns = systemColumns.filter(
    (column) => !(column in (records[0] ?? {})),
  );
  if (missingColumns.length > 0) {
    throw new Error(`Missing CSV columns: ${missingColumns.join(", ")}`);
  }

  return records.map((record, index) => {
    const result = systemRowSchema.safeParse(record);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new Error(
        `Invalid row ${index + 2} in ${path.basename(csvPath)}: ${issue.path.join(".")} ${issue.message}`,
      );
    }

    return result.data;
  });
}

function recreateTable(
  db: Database.Database,
  tableName: string,
  rows: SystemRow[],
) {
  const definitions = systemColumns
    .map((column) => `"${column}" ${columnType(column)}`)
    .join(", ");
  const placeholders = systemColumns.map(() => "?").join(", ");
  const quotedColumns = systemColumns.map((column) => `"${column}"`).join(", ");

  db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  db.exec(`CREATE TABLE ${tableName} (${definitions})`);

  const insert = db.prepare(
    `INSERT INTO ${tableName} (${quotedColumns}) VALUES (${placeholders})`,
  );
  const insertMany = db.transaction((items: SystemRow[]) => {
    for (const row of items) {
      insert.run(systemColumns.map((column) => row[column]));
    }
  });
  insertMany(rows);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_ptm ON ${tableName}(ptm_type)`,
  );
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_system ON ${tableName}(ptm_type, protein_name)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_uniprot_site ON ${tableName}(uniprot_id, site)`,
  );
}

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const passRows = readRows(passCsv);
const db = new Database(dbFile);

db.pragma("journal_mode = WAL");
recreateTable(db, "systems", passRows);

if (fs.existsSync(allCsv)) {
  recreateTable(db, "systems_all", readRows(allCsv));
}

db.close();

console.log(`Imported ${passRows.length} PASS systems into ${dbFile}`);
