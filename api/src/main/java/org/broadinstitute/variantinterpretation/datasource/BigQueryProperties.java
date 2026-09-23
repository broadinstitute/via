package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.DatasetId;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Location of the BigQuery dataset and table backing variant search. */
@ConfigurationProperties(prefix = "bigquery")
public record BigQueryProperties(String projectId, String datasetId, String tableId) {

  /** The configured dataset, as the id type the BigQuery client expects. */
  public DatasetId dataset() {
    return DatasetId.of(projectId, datasetId);
  }

  /** Fully-qualified, backtick-quotable reference to the configured VAT table, for use in SQL. */
  public String tableRef() {
    return tableRef(tableId);
  }

  /**
   * Same, for another table in the configured dataset. The condition lookup tables aren't
   * configurable the way the VAT table is: `cb_criteria`, `concept_ancestor` and
   * `condition_occurrence` are fixed names in every All of Us CDR, so only the dataset varies.
   */
  public String tableRef(String table) {
    return "`%s.%s.%s`".formatted(projectId, datasetId, table);
  }

  @Override
  public String toString() {
    return projectId + ":" + datasetId;
  }
}
