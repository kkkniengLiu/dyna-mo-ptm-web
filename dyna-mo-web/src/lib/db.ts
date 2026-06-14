import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  systemRowSchema,
  systemSummarySchema,
  type SystemRow,
  type SystemSummary,
} from "@/lib/schema";

export type DatasetStats = {
  totalSystems: number;
  ptmCounts: Array<{ ptm_type: string; count: number }>;
  totalTrajectoryMicroseconds: number;
  meanPlddt: number;
  meanRmsd: number;
  meanResidues: number;
};

const dbPath =
  process.env.DYNA_MO_DB_PATH ??
  path.join(process.cwd(), "data", "dyna_mo.sqlite");

let cachedDb: Database.Database | null = null;

function databaseExists() {
  return fs.existsSync(dbPath);
}

function getDb() {
  if (!databaseExists()) {
    return null;
  }

  if (!cachedDb) {
    cachedDb = new Database(dbPath, { readonly: true, fileMustExist: true });
    cachedDb.pragma("query_only = true");
  }

  return cachedDb;
}

export function hasDatabase() {
  return databaseExists();
}

export function getSystems(): SystemSummary[] {
  const db = getDb();
  if (!db) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT ptm_type, protein_name, uniprot_id, site, mod,
              rmsd_equil_mean_A, rg_mean_A, rmsf_mean_core_A,
              n_residues, sim_time_ns, n_reps, plddt_mean, site_plddt,
              burial_class, site_ss_dominant, sasa_site_mean_nm2,
              n_sb_contacts_mean, chi1_dominant_rotamer, chi2_dominant_rotamer,
              rmsd_inter_mean, rmsd_1v2, rmsd_1v3, rmsd_2v3
         FROM systems
        ORDER BY ptm_type, protein_name`,
    )
    .all();

  return systemSummarySchema.array().parse(rows);
}

export function getSystem(
  ptmType: string,
  proteinName: string,
): SystemRow | null {
  const db = getDb();
  if (!db) {
    return null;
  }

  const row = db
    .prepare("SELECT * FROM systems WHERE ptm_type = ? AND protein_name = ?")
    .get(ptmType, proteinName);

  if (!row) {
    return null;
  }

  return systemRowSchema.parse(row);
}

export function getStats(): DatasetStats {
  const db = getDb();
  if (!db) {
    return {
      totalSystems: 0,
      ptmCounts: [],
      totalTrajectoryMicroseconds: 0,
      meanPlddt: 0,
      meanRmsd: 0,
      meanResidues: 0,
    };
  }

  const totalSystems = db
    .prepare("SELECT COUNT(*) AS count FROM systems")
    .get() as { count: number };

  const ptmCounts = db
    .prepare(
      "SELECT ptm_type, COUNT(*) AS count FROM systems GROUP BY ptm_type ORDER BY count DESC",
    )
    .all() as Array<{ ptm_type: string; count: number }>;

  const aggregate = db
    .prepare(
      `SELECT COALESCE(SUM(traj_ns_total), 0) / 1000.0 AS totalTrajectoryMicroseconds,
            COALESCE(AVG(plddt_mean), 0) AS meanPlddt,
            COALESCE(AVG(rmsd_equil_mean_A), 0) AS meanRmsd,
            COALESCE(AVG(n_residues), 0) AS meanResidues
       FROM systems`,
    )
    .get() as {
    totalTrajectoryMicroseconds: number;
    meanPlddt: number;
    meanRmsd: number;
    meanResidues: number;
  };

  return {
    totalSystems: totalSystems.count,
    ptmCounts,
    totalTrajectoryMicroseconds: aggregate.totalTrajectoryMicroseconds,
    meanPlddt: aggregate.meanPlddt,
    meanRmsd: aggregate.meanRmsd,
    meanResidues: aggregate.meanResidues,
  };
}
