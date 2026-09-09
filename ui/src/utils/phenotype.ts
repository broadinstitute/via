/**
 * There's no real phenotype/participant data source wired up yet, so phenotype-derived panels
 * are always empty -- this just makes the empty-state copy honest about whether an HPO term was
 * actually entered, rather than always claiming none was.
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
