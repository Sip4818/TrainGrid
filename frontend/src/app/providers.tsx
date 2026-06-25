import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers wraps the application with global React providers.
 * Currently hosts the TanStack Query client so all hooks and pages
 * can use useQuery / useMutation without manual wiring.
 */
export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
