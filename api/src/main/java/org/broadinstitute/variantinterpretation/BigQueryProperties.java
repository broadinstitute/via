package org.broadinstitute.variantinterpretation;

import com.google.cloud.bigquery.DatasetId;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Location of the BigQuery dataset backing variant search. */
@ConfigurationProperties(prefix = "bigquery")
public record BigQueryProperties(String projectId, String datasetId) {

  /** The configured dataset, as the id type the BigQuery client expects. */
  public DatasetId dataset() {
    return DatasetId.of(projectId, datasetId);
  }

  @Override
  public String toString() {
    return projectId + ":" + datasetId;
  }
}