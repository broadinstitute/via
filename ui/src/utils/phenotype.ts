/**
 * Empty-state copy for the phenotype-derived panels. Any condition the backend finds comes back
 * matched (against mock participant data, until a real source exists), so in practice these panels
 * are only empty when no condition was picked -- the second branch covers a picked concept the CDR
 * doesn't have.
 */
export function phenotypeUnavailableCopy(condition: string, subject: string) {
  if (!condition) {
    return {
      message: `No phenotype specified — add a phenotype filter to see ${subject}.`,
      buttonLabel: "Add phenotype filter",
    };
  }
  return {
    message: `No phenotype data available yet for ${condition}.`,
    buttonLabel: "Modify phenotype filter",
  };
}
