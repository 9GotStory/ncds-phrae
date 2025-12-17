import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always fetch fresh data (Realtime)
      gcTime: FIVE_MINUTES, // Keep unused data in memory for instant feedback later
      retry: 1,
      refetchOnWindowFocus: true, // Update when user comes back to tab
      refetchOnReconnect: true,
    },
  },
});

