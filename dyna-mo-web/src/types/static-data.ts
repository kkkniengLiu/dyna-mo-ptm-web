export type PtmCount = {
  ptm_type: string;
  label: string;
  color: string;
  count: number;
};

export type PublicSystem = {
  id: string;
  uniprot: string;
  ptm_type: string;
  ptm_label: string;
  ptm_family: "K/R-PTM" | "phosphorylation";
  color: string;
  mod_residue: string;
  site_num: number | null;
  ccd_code: string;
  status: string;
  final_flag: string;
  site_status: string;
  schema_version: string;
  n_residues: number | null;
  sim_time_ns: number | null;
  traj_ns_total: number | null;
  rmsd_equil_mean_A: number | null;
  rg_mean_A: number | null;
  rmsf_mean_A: number | null;
  rmsf_max_A: number | null;
  sasa_site_mean_nm2: number | null;
  n_sb_contacts_mean: number | null;
  chi1_dominant_rotamer: string;
  chi2_dominant_rotamer: string;
  site_ss_dominant: string;
  terminal_proximal: string;
  burial_class: string;
  site_plddt: number | null;
  local_pLDDT_8A: number | null;
  has_structure: boolean;
  structure_path: string;
  zenodo_url: string;
  raw: Record<string, string>;
};

export type StaticDataset = {
  generated_at: string;
  source_csv: string;
  schema_version: string;
  stats: {
    systems: number;
    ptm_types: number;
    total_simulation_us: number;
    local_structures: number;
    median_length: number | null;
    counts: PtmCount[];
  };
  systems: PublicSystem[];
};
