/**
 * Empty-state copy for the phenotype-derived panels. Any HPO term now comes back matched (against
 * mock participant data, until a real source exists), so in practice these panels are only empty
 * when no term was entered -- the second branch is a safety net for a term the backend couldn't
 * match rather than the case it was originally written for.
 */
export function phenotypeUnavailableCopy(hpoTerm: string, subject: string) {
  if (!hpoTerm) {
    return {
      message: `No phenotype specified — add a phenotype filter to see ${subject}.`,
      buttonLabel: "Add phenotype filter",
    };
  }
  return {
    message: `No phenotype data available yet for ${hpoTerm}.`,
    buttonLabel: "Modify phenotype filter",
  };
}
