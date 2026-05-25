import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEcran,
  deleteEcran,
  EcranUpdatePayload,
  updateEcran,
} from "@/app/services/ecran";

export function useDeleteEcran() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEcran,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useCreateEcran() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEcran,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useUpdateEcran() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EcranUpdatePayload }) =>
      updateEcran(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}
