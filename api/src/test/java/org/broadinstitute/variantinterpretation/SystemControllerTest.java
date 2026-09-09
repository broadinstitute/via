package org.broadinstitute.variantinterpretation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.Dataset;
import org.broadinstitute.variantinterpretation.model.BigQueryStatus;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class SystemControllerTest {

  @Test
  void bigQueryStatus_returnsAccessibleTrue_whenDatasetIsReachable() {
    BigQueryProperties properties = new BigQueryProperties("test-project", "test_dataset", "v1");
    BigQuery bigQuery = mock(BigQuery.class);
    when(bigQuery.getDataset(properties.dataset())).thenReturn(mock(Dataset.class));

    SystemController controller = new SystemController(bigQuery, properties);
    ResponseEntity<BigQueryStatus> response = controller.bigQueryStatus();

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getAccessible()).isTrue();
    assertThat(response.getBody().getDataset()).isEqualTo("test-project:test_dataset");
    assertThat(response.getBody().getDetail().orElse(null)).isNull();
  }
}
