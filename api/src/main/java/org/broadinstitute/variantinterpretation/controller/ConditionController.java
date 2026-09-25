package org.broadinstitute.variantinterpretation.controller;

import org.broadinstitute.variantinterpretation.api.ConditionApi;
import org.broadinstitute.variantinterpretation.datasource.ConditionLookupService;
import org.broadinstitute.variantinterpretation.model.ConditionCandidates;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Condition concept lookup for the phenotype search box's dropdown.
 */
@RestController
public class ConditionController implements ConditionApi {

  private final ConditionLookupService conditionLookup;

  public ConditionController(ConditionLookupService conditionLookup) {
    this.conditionLookup = conditionLookup;
  }

  @Override
  public ResponseEntity<ConditionCandidates> conditionCandidates(String condition) {
    return ResponseEntity.ok(conditionLookup.candidates(condition));
  }
}
