import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BusinessType = "trader" | "manufacturer";

export function useBusinessType() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-setting", "business_type"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "business_type")
        .maybeSingle();
      return (data?.value as BusinessType) || "trader";
    },
  });

  return {
    businessType: data || "trader",
    isManufacturer: data === "manufacturer",
    isTrader: data !== "manufacturer",
    isLoading,
  };
}
