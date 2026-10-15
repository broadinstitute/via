package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.JobStatistics;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.broadinstitute.variantinterpretation.model.QueryUsage;
import org.springframework.stereotype.Component;

/**
 * Running totals of this instance's BigQuery usage, from the statistics BigQuery reports on each
 * job. One per process: a Workbench app serves one user, so the process's lifetime is their
 * session, and the totals reset with it. Queries can run concurrently, hence the atomics.
 */
@Component
public class QueryUsageMeter {

  /** BigQuery on-demand analysis pricing, US dollars per TiB billed. */
  static final double USD_PER_TIB = 6.25;

  private static final double BYTES_PER_TIB = 1024.0 * 1024 * 1024 * 1024;

  private final OffsetDateTime since;
  private final AtomicInteger queries = new AtomicInteger();
  private final AtomicInteger cacheHits = new AtomicInteger();
  private final AtomicLong bytesProcessed = new AtomicLong();
  private final AtomicLong bytesBilled = new AtomicLong();
  private final AtomicLong slotMilliseconds = new AtomicLong();

  public QueryUsageMeter() {
    this(Clock.systemUTC());
  }

  QueryUsageMeter(Clock clock) {
    this.since = OffsetDateTime.now(clock);
  }

  /** Adds one finished query's statistics. Any figure BigQuery left out counts as zero. */
  public void record(JobStatistics.QueryStatistics statistics) {
    queries.incrementAndGet();
    if (Boolean.TRUE.equals(statistics.getCacheHit())) {
      cacheHits.incrementAndGet();
    }
    bytesProcessed.addAndGet(zeroIfNull(statistics.getTotalBytesProcessed()));
    bytesBilled.addAndGet(zeroIfNull(statistics.getTotalBytesBilled()));
    slotMilliseconds.addAndGet(zeroIfNull(statistics.getTotalSlotMs()));
  }

  /** A query that ran but whose statistics couldn't be fetched: counted, with nothing to add. */
  public void recordUnknown() {
    queries.incrementAndGet();
  }

  public QueryUsage snapshot() {
    long billed = bytesBilled.get();
    return new QueryUsage()
        .queries(queries.get())
        .cacheHits(cacheHits.get())
        .bytesProcessed(bytesProcessed.get())
        .bytesBilled(billed)
        .slotMilliseconds(slotMilliseconds.get())
        .estimatedCostUsd(billed / BYTES_PER_TIB * USD_PER_TIB)
        .since(since);
  }

  private static long zeroIfNull(Long value) {
    return value == null ? 0 : value;
  }
}
