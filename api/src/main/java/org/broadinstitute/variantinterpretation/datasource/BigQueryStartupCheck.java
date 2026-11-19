package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.TableId;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Refuses to start unless the credentials can read every table VIA needs and submit query jobs in
 * the billing project, so a user without BigQuery access gets a failed start instead of a working
 * page whose searches return 500.
 *
 * <p>Off unless {@code bigquery.require-access-on-startup} is true ({@code
 * VIA_REQUIRE_BIGQUERY_ACCESS}): the Terra runtime turns it on (deploy/terra/app-start.sh), but
 * other deployments and local development keep starting without BigQuery.
 *
 * <p>The checks are the same as {@code /api/status} plus a dry-run query, which is what covers job
 * permission (see {@link BigQueryService#checkJobAccess}).
 */
@Component
@ConditionalOnProperty(name = "bigquery.require-access-on-startup", havingValue = "true")
public class BigQueryStartupCheck implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(BigQueryStartupCheck.class);

  private final BigQueryService bigQuery;
  private final BigQueryProperties properties;

  public BigQueryStartupCheck(BigQueryService bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  @Override
  public void run(ApplicationArguments args) {
    List<String> problems = problems();
    if (!problems.isEmpty()) {
      // Thrown from an ApplicationRunner, so the application exits instead of serving.
      throw new IllegalStateException(
          "VIA cannot access BigQuery, so it will not start:\n  - " + String.join("\n  - ", problems));
    }
    log.info("BigQuery access check passed");
  }

  /** What is wrong with the credentials or setup; empty when everything checks out. */
  List<String> problems() {
    List<String> problems = new ArrayList<>();

    String jobProblem = bigQuery.checkJobAccess();
    if (jobProblem != null) {
      problems.add(
          "cannot submit query jobs in billing project %s (needs BigQuery Job User): %s"
              .formatted(properties.billingProjectId(), jobProblem));
    }

    List<TableId> tables = new ArrayList<>();
    tables.add(properties.vatTable());
    ConditionLookupService.CDR_TABLES.forEach(t -> tables.add(properties.cdrTable(t)));
    for (TableId table : tables) {
      var status = bigQuery.checkAccess(table);
      if (!Boolean.TRUE.equals(status.getAccessible())) {
        problems.add(
            "cannot read table %s (needs BigQuery Data Viewer): %s"
                .formatted(status.getTable(), status.getDetail()));
      }
    }
    return problems;
  }
}
