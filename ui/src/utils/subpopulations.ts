import colors from "../libs/colors";
import type {
    GnomadSubpopCode,
    SubpopCode
} from "../types/results";

// AFR, AMR, EAS, SAS, and OTH are shared between AoU and gnomAD, so they share
// a color; FIN, NFE, and ASJ only exist in gnomAD's subpopulation scheme.
export const SUBPOP_COLOR: Record<SubpopCode | GnomadSubpopCode, string> = {
    EUR: colors.subpopEur,
    AFR: colors.subpopAfr,
    AMR: colors.subpopAmr,
    EAS: colors.subpopEas,
    SAS: colors.subpopSas,
    MID: colors.subpopMid,
    OTH: colors.subpopOth,
    FIN: colors.subpopFin,
    NFE: colors.subpopNfe,
    ASJ: colors.subpopAsj,
};

export const SUBPOP_LABEL: Record<SubpopCode | GnomadSubpopCode, string> = {
    EUR: "European",
    AFR: "African/African American",
    AMR: "Latino/Admixed American",
    EAS: "East Asian",
    SAS: "South Asian",
    MID: "Middle Eastern",
    OTH: "Other",
    FIN: "Finnish",
    NFE: "Non-Finnish European",
    ASJ: "Ashkenazi Jewish",
};
