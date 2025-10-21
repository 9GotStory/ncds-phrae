type QueryStatus = "pending" | "success" | "error" | undefined;
type QueryFetchStatus = "idle" | "fetching" | "paused" | undefined;

interface QueryStateLike {
  status?: QueryStatus;
  fetchStatus?: QueryFetchStatus;
  data?: unknown;
}

interface CombinedQueryState {
  isInitialLoading: boolean;
  isRefreshing: boolean;
}

export function getCombinedQueryState(
  queries: Array<QueryStateLike | undefined>
): CombinedQueryState {
  let isInitialLoading = false;
  let hasRefreshInProgress = false;

  for (const query of queries) {
    if (!query) {
      continue;
    }

    if (query.fetchStatus === "fetching") {
      if (query.status === "pending" || query.data === undefined) {
        isInitialLoading = true;
        hasRefreshInProgress = false;
        break;
      }

      hasRefreshInProgress = true;
    }
  }

  return {
    isInitialLoading,
    isRefreshing: !isInitialLoading && hasRefreshInProgress,
  };
}
