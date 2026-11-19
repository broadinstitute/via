package org.broadinstitute.variantinterpretation.datasource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.BigQueryException;
import com.google.cloud.bigquery.JobInfo;
import com.google.cloud.bigquery.Table;
import com.google.cloud.bigquery.TableId;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

class BigQueryStartupCheckTest {

  private final BigQuery bigQuery = mock(BigQuery.class);
  private final BigQueryProperties properties =
      new BigQueryProperties("billing-project", "vat-project", "vat_dataset", "v1", "cdr-project.test_cdr");
  private final BigQueryStartupCheck check =
      new BigQueryStartupCheck(new BigQueryService(bigQuery, new QueryUsageMeter()), properties);

  @Test
  void startsWhenTablesAreReadableAndJobsCanBeSubmitted() {
    when(bigQuery.getTable(any(TableId.class))).thenReturn(mock(Table.class));

    assertThat(check.problems()).isEmpty();
    check.run(new DefaultApplicationArguments());
  }

  @Test
  void refusesToStartWhenJobsCantBeSubmitted() {
    when(bigQuery.getTable(any(TableId.class))).thenReturn(mock(Table.class));
    when(bigQuery.create(any(JobInfo.class))).thenThrow(new BigQueryException(403, "denied: bigquery.jobs.create"));

    assertThat(check.problems()).singleElement().asString().contains("billing-project").contains("denied");
    assertThatThrownBy(() -> check.run(new DefaultApplicationArguments()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("will not start");
  }

  @Test
  void refusesToStartWhenATableIsUnreadable() {
    when(bigQuery.getTable(any(TableId.class))).thenReturn(mock(Table.class));
    when(bigQuery.getTable(properties.vatTable())).thenThrow(new BigQueryException(403, "no access"));

    assertThat(check.problems()).singleElement().asString().contains("vat-project.vat_dataset.v1").contains("no access");
  }

  @Test
  void reportsEveryProblemAtOnce() {
    when(bigQuery.getTable(any(TableId.class))).thenReturn(null);
    when(bigQuery.create(any(JobInfo.class))).thenThrow(new BigQueryException(403, "denied"));

    // one for jobs, and the VAT table plus the three CDR tables
    assertThat(check.problems()).hasSize(5);
  }
}
