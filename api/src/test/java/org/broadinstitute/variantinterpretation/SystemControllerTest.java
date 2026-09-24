package org.broadinstitute.variantinterpretation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.Table;
import com.google.cloud.bigquery.TableId;
import org.broadinstitute.variantinterpretation.controller.SystemController;
import org.broadinstitute.variantinterpretation.datasource.BigQueryProperties;
import org.broadinstitute.variantinterpretation.model.BigQueryStatus;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class SystemControllerTest {

  private final BigQueryProperties properties =
      new BigQueryProperties(
          "billing-project", "test-project", "test_dataset", "v1", "cdr-project.test_cdr");

  @Test
  void bigQueryStatus_returnsAccessibleTrue_whenEveryTableIsReachable() {
    BigQuery bigQuery = mock(BigQuery.class);
    when(bigQuery.getTable(any(TableId.class))).thenReturn(mock(Table.class));

    ResponseEntity<BigQueryStatus> response =
        new SystemController(bigQuery, properties).bigQueryStatus();

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getAccessible()).isTrue();
    assertThat(response.getBody().getTables())
        .containsExactly(
            "test-project.test_dataset.v1",
            "cdr-project.test_cdr.cb_criteria",
            "cdr-project.test_cdr.concept_ancestor",
            "cdr-project.test_cdr.condition_occurrence");
    assertThat(response.getBody().getDetail().orElse(null)).isNull();
  }

  @Test
  void bigQueryStatus_namesEveryUnreachableTable() {
    BigQuery bigQuery = mock(BigQuery.class);
    when(bigQuery.getTable(any(TableId.class))).thenReturn(mock(Table.class));
    when(bigQuery.getTable(properties.vatTable())).thenReturn(null);
    when(bigQuery.getTable(properties.cdrTable("concept_ancestor")))
        .thenThrow(new RuntimeException("Access Denied"));

    BigQueryStatus status = new SystemController(bigQuery, properties).bigQueryStatus().getBody();

    assertThat(status).isNotNull();
    assertThat(status.getAccessible()).isFalse();
    assertThat(status.getDetail().orElse(null))
        .isEqualTo(
            "test-project.test_dataset.v1: does not exist, or is not visible to us; "
                + "cdr-project.test_cdr.concept_ancestor: Access Denied");
  }
}
