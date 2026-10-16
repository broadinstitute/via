package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.JobStatistics;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import org.broadinstitute.variantinterpretation.model.QueryJob;
import org.broadinstitute.variantinterpretation.model.QueryUsage;
import org.broadinstitute.variantinterpretation.model.SearchUsage;
import org.springframework.stereotype.Component;

/**
 * Running totals of this instance's BigQuery usage, from the statistics BigQuery reports on each
 * job, plus a log of the last few requests that queried BigQuery (searches and the condition
 * type-ahead's lookups) with the jobs each one ran. One per process: a Workbench app serves one
 * user, so the process's lifetime is their session, and the totals reset with it.
 *
 * <p>A request is attributed by thread: its controller brackets the work with {@link #beginSearch}
 * or {@link #beginConditionLookup} and {@link #endSearch}, and every job metered on that thread in
 * between belongs to it. Spring handles a request on one thread, so that's exact. A request that
 * ran no job (a blank type-ahead term) is dropped from the log at the end, since it cost nothing.
 *
 * <p>Every read and write of the totals and the log holds the meter's own monitor, so a snapshot
 * describes one state: its totals always equal the sum of its log. Separate counters, however
 * atomic each, could be read half-way through a job being recorded. A few operations a second
 * never contend for it.
 */
@Component
public class QueryUsageMeter {

  /** BigQuery on-demand analysis pricing, US dollars per TiB billed. */
  static final double USD_PER_TIB = 6.25;

  /** How many searches are kept for the log; older ones fall off the end. */
  static final int SEARCHES_KEPT = 20;

  private static final double BYTES_PER_TIB = 1024.0 * 1024 * 1024 * 1024;

  /** One request's jobs, filled in while it runs. Guarded by the meter's monitor. */
  private static final class SearchRecord {
    final int id;
    final SearchUsage.KindEnum kind;
    final OffsetDateTime at;
    final List<String> variants;
    final String term;
    String phenotype;
    final List<QueryJob> jobs = new ArrayList<>();

    SearchRecord(int id, SearchUsage.KindEnum kind, OffsetDateTime at, List<String> variants, String term) {
      this.id = id;
      this.kind = kind;
      this.at = at;
      this.variants = List.copyOf(variants);
      this.term = term;
    }

    SearchUsage snapshot() {
      long billed = jobs.stream().mapToLong(QueryJob::getBytesBilled).sum();
      return new SearchUsage()
          .id(id)
          .kind(kind)
          .at(at)
          .variants(variants)
          .phenotype(phenotype)
          .term(term)
          .queries(List.copyOf(jobs))
          .cacheHits((int) jobs.stream().filter(QueryJob::getCacheHit).count())
          .bytesProcessed(jobs.stream().mapToLong(QueryJob::getBytesProcessed).sum())
          .bytesBilled(billed)
          .estimatedCostUsd(cost(billed));
    }
  }

  private final Clock clock;
  private final OffsetDateTime since;
  // All guarded by this.
  private int queries;
  private int cacheHits;
  private long bytesProcessed;
  private long bytesBilled;
  private long slotMilliseconds;
  private int searchIds;
  /** Newest first. */
  private final Deque<SearchRecord> searches = new ArrayDeque<>();
  /** The request this thread is in; per-thread, so unguarded. */
  private final ThreadLocal<SearchRecord> current = new ThreadLocal<>();

  public QueryUsageMeter() {
    this(Clock.systemUTC());
  }

  QueryUsageMeter(Clock clock) {
    this.clock = clock;
    this.since = OffsetDateTime.now(clock);
  }

  /** Starts attributing this thread's jobs to a new search, the newest in the log. */
  public synchronized void beginSearch(List<String> variants) {
    begin(new SearchRecord(++searchIds, SearchUsage.KindEnum.SEARCH, OffsetDateTime.now(clock), variants, null));
  }

  /** Starts attributing this thread's jobs to a condition lookup for the type-ahead. */
  public synchronized void beginConditionLookup(String term) {
    begin(new SearchRecord(++searchIds, SearchUsage.KindEnum.CONDITION, OffsetDateTime.now(clock), List.of(), term));
  }

  private void begin(SearchRecord record) {
    searches.addFirst(record);
    while (searches.size() > SEARCHES_KEPT) {
      searches.removeLast();
    }
    current.set(record);
  }

  /** Names the current search's condition, once the search has resolved it. No-op outside a search. */
  public synchronized void describeSearchPhenotype(String phenotype) {
    SearchRecord search = current.get();
    if (search != null) {
      search.phenotype = phenotype;
    }
  }

  /**
   * Stops attributing this thread's jobs. Always called, so a failed request can't leak into the
   * next. A request that ran no job is taken out of the log: nothing to account for.
   */
  public synchronized void endSearch() {
    SearchRecord record = current.get();
    current.remove();
    if (record != null && record.jobs.isEmpty()) {
      searches.remove(record);
    }
  }

  /** Adds one finished query's statistics. Any figure BigQuery left out counts as zero. */
  public synchronized void record(String name, JobStatistics.QueryStatistics statistics) {
    boolean cacheHit = Boolean.TRUE.equals(statistics.getCacheHit());
    long processed = zeroIfNull(statistics.getTotalBytesProcessed());
    long billed = zeroIfNull(statistics.getTotalBytesBilled());
    long slotMs = zeroIfNull(statistics.getTotalSlotMs());
    queries++;
    if (cacheHit) {
      cacheHits++;
    }
    bytesProcessed += processed;
    bytesBilled += billed;
    slotMilliseconds += slotMs;
    attach(
        new QueryJob()
            .name(name)
            .at(OffsetDateTime.now(clock))
            .cacheHit(cacheHit)
            .bytesProcessed(processed)
            .bytesBilled(billed)
            .slotMilliseconds(slotMs));
  }

  /** A query that ran but whose statistics couldn't be fetched: counted, with nothing to add. */
  public synchronized void recordUnknown(String name) {
    queries++;
    attach(
        new QueryJob().name(name).at(OffsetDateTime.now(clock)).cacheHit(false).bytesProcessed(0L).bytesBilled(0L).slotMilliseconds(0L));
  }

  private void attach(QueryJob job) {
    SearchRecord search = current.get();
    if (search != null) {
      search.jobs.add(job);
    }
  }

  public synchronized QueryUsage snapshot() {
    return new QueryUsage()
        .queries(queries)
        .cacheHits(cacheHits)
        .bytesProcessed(bytesProcessed)
        .bytesBilled(bytesBilled)
        .slotMilliseconds(slotMilliseconds)
        .estimatedCostUsd(cost(bytesBilled))
        .since(since)
        .searches(searches.stream().map(SearchRecord::snapshot).toList());
  }

  private static double cost(long bytesBilled) {
    return bytesBilled / BYTES_PER_TIB * USD_PER_TIB;
  }

  private static long zeroIfNull(Long value) {
    return value == null ? 0 : value;
  }
}
