"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

const DEFAULT_YEAR_MIN = 1920;
const DEFAULT_YEAR_MAX = 2025;

export function useFilterParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedSpecies = useMemo(() => {
    const raw = searchParams.get("species");
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").filter(Boolean));
  }, [searchParams]);

  const selectedRegion = useMemo(() => {
    return searchParams.get("region") ?? "";
  }, [searchParams]);

  const yearRange = useMemo((): [number, number] => {
    const min = parseInt(searchParams.get("yearMin") ?? "");
    const max = parseInt(searchParams.get("yearMax") ?? "");
    return [
      isNaN(min) ? DEFAULT_YEAR_MIN : min,
      isNaN(max) ? DEFAULT_YEAR_MAX : max,
    ];
  }, [searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const setSelectedSpecies = useCallback(
    (species: Set<string>) => {
      updateParams({
        species: species.size > 0 ? Array.from(species).join(",") : null,
      });
    },
    [updateParams],
  );

  const setSelectedRegion = useCallback(
    (region: string) => {
      updateParams({ region: region || null });
    },
    [updateParams],
  );

  const setYearRange = useCallback(
    (range: [number, number]) => {
      updateParams({
        yearMin: range[0] !== DEFAULT_YEAR_MIN ? String(range[0]) : null,
        yearMax: range[1] !== DEFAULT_YEAR_MAX ? String(range[1]) : null,
      });
    },
    [updateParams],
  );

  return {
    selectedSpecies,
    setSelectedSpecies,
    selectedRegion,
    setSelectedRegion,
    yearRange,
    setYearRange,
  };
}
