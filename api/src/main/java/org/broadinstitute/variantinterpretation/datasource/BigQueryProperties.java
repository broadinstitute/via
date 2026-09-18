package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.DatasetId;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Location of the BigQuery dataset and table backing variant search, plus the size of the cohort
 * that table was built from.
 *
 * @param cohortParticipants how many participants are in the cohort behind the configured table.
 *     The VAT has no column for this -- it's a property of the CDR release the table was generated
 *     from -- but it's what the cohort-wide allele numbers are counted over, so it has to be
 *     configured alongside the table and kept in step with it.
 */
@ConfigurationProperties(prefix = "bigquery")
public record BigQueryProperties(
    String projectId, String datasetId, String tableId, int cohortParticipants) {

  /** The configured dataset, as the id type the BigQuery client expects. */
  public DatasetId dataset() {
    return DatasetId.of(projectId, datasetId);
  }

  /** Fully-qualified, backtick-quotable reference to the configured table, for use in SQL. */
  public String tableRef() {
    return "`%s.%s.%s`".formatted(projectId, datasetId, tableId);
  }

  @Override
  public String toString() {
    return projectId + ":" + datasetId;
  }
}
