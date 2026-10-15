package org.broadinstitute.variantinterpretation.datasource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.cloud.bigquery.JobStatistics;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.broadinstitute.variantinterpretation.model.QueryUsage;
import org.junit.jupiter.api.Test;

class QueryUsageMeterTest {

  private static final Instant START = Instant.parse("2026-10-14T15:00:00Z");

  private static JobStatistics.QueryStatistics stats(Long processed, Long billed, Boolean cacheHit, Long slotMs) {
    JobStatistics.QueryStatistics statistics = mock(JobStatistics.QueryStatistics.class);
    when(statistics.getTotalBytesProcessed()).thenReturn(processed);
    when(statistics.getTotalBytesBilled()).thenReturn(billed);
    when(statistics.getCacheHit()).thenReturn(cacheHit);
    when(statistics.getTotalSlotMs()).thenReturn(slotMs);
    return statistics;
  }

  @Test
  void startsAtZeroFromWhenItWasMade() {
    QueryUsage usage = new QueryUsageMeter(Clock.fixed(START, ZoneOffset.UTC)).snapshot();

    assertThat(usage.getQueries()).isZero();
    assertThat(usage.getBytesBilled()).isZero();
    assertThat(usage.getEstimatedCostUsd()).isZero();
    assertThat(usage.getSince().toInstant()).isEqualTo(START);
  }

  /** Bytes, slot time and cache hits add up across queries; cost follows bytes billed at the on-demand rate. */
  @Test
  void addsUpEveryQuery() {
    QueryUsageMeter meter = new QueryUsageMeter(Clock.fixed(START, ZoneOffset.UTC));
    long gib = 1024L * 1024 * 1024;

    meter.record(stats(3 * gib, 3 * gib, false, 40_000L));
    meter.record(stats(3 * gib, 0L, true, 0L));
    meter.record(stats(2 * 1024 * 1024L, 10 * 1024 * 1024L, false, 150L));

    QueryUsage usage = meter.snapshot();
    assertThat(usage.getQueries()).isEqualTo(3);
    assertThat(usage.getCacheHits()).isEqualTo(1);
    assertThat(usage.getBytesProcessed()).isEqualTo(6 * gib + 2 * 1024 * 1024L);
    assertThat(usage.getBytesBilled()).isEqualTo(3 * gib + 10 * 1024 * 1024L);
    assertThat(usage.getSlotMilliseconds()).isEqualTo(40_150L);
    // 3 GiB + 10 MiB at $6.25 per TiB.
    assertThat(usage.getEstimatedCostUsd()).isCloseTo((3.0 + 10.0 / 1024) / 1024 * 6.25, within(1e-9));
  }

  /** BigQuery leaves figures null on some jobs (a dry run, a failed one); they count as nothing. */
  @Test
  void treatsMissingFiguresAsZero() {
    QueryUsageMeter meter = new QueryUsageMeter();

    meter.record(stats(null, null, null, null));
    meter.recordUnknown();

    QueryUsage usage = meter.snapshot();
    assertThat(usage.getQueries()).isEqualTo(2);
    assertThat(usage.getCacheHits()).isZero();
    assertThat(usage.getBytesBilled()).isZero();
  }
}
