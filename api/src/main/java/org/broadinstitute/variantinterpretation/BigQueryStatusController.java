package org.broadinstitute.variantinterpretation;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.Dataset;
import org.broadinstitute.variantinterpretation.api.BigQueryStatusApi;
import org.broadinstitute.variantinterpretation.model.BigQueryStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BigQueryStatusController implements BigQueryStatusApi {

  private static final Logger log = LoggerFactory.getLogger(BigQueryStatusController.class);

  private final BigQuery bigQuery;
  private final BigQueryProperties properties;

  public BigQueryStatusController(BigQuery bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  /**
   * Reads the dataset's metadata. This is the cheapest call that exercises the whole path we
   * care about — credentials resolve, the project is reachable, and the dataset is visible to
   * us — without running a query or needing a table name.
   */
  @Override
  public ResponseEntity<BigQueryStatus> bigQueryStatus() {
    var status = new BigQueryStatus().dataset(properties.toString());
    try {
      Dataset dataset = bigQuery.getDataset(properties.dataset());
      if (dataset == null) {
        // The client returns null rather than throwing when the dataset isn't there.
        return ResponseEntity.ok(
            status.accessible(false).detail("Dataset does not exist, or is not visible to us."));
      }
      return ResponseEntity.ok(status.accessible(true));
    } catch (RuntimeException e) {
      log.warn("BigQuery access check failed for dataset {}", properties, e);
      return ResponseEntity.ok(status.accessible(false).detail(e.getMessage()));
    }
  }
}
