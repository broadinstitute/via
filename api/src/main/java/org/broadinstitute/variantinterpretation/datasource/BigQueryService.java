package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.FieldValueList;
import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableId;
import org.broadinstitute.variantinterpretation.model.TableStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * All of this app's calls to BigQuery go through here, so query cost caps, logging and error
 * handling are applied in one place.
 */
@Service
public class BigQueryService {

  private static final Logger log = LoggerFactory.getLogger(BigQueryService.class);

  // Right now this is a small limit to keep development costs low and prevent accidental
  // full-table scan. When using the real VAT we'll need to use a more realistic value. See VIA-50
  private static final long MAXIMUM_BYTES_BILLED = 100L * 1024 * 1024;

  private final BigQuery bigQuery;

  public BigQueryService(BigQuery bigQuery) {
    this.bigQuery = bigQuery;
  }

  /** Takes the builder rather than a built configuration so the cost cap can't be skipped. */
  public Iterable<FieldValueList> query(QueryJobConfiguration.Builder builder) {
    QueryJobConfiguration configuration = builder.setMaximumBytesBilled(MAXIMUM_BYTES_BILLED).build();
    log.info("Running BigQuery query: {}", configuration.getQuery());
    try {
      return bigQuery.query(configuration).iterateAll();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while querying BigQuery", e);
    }
  }

  /** Whether the current credentials can see this table, with the reason when they can't. */
  public TableStatus checkAccess(TableId table) {
    var status = new TableStatus().table("%s.%s.%s".formatted(table.getProject(), table.getDataset(), table.getTable()));
    try {
      if (bigQuery.getTable(table) == null) {
        return status.accessible(false).detail("Table does not exist, or is not visible to user.");
      }
      return status.accessible(true);
    } catch (RuntimeException e) {
      log.warn("BigQuery access check failed for table {}", status.getTable(), e);
      return status.accessible(false).detail(e.getMessage());
    }
  }
}
