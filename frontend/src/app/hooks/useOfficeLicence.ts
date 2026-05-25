import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLicence,
  deleteLicence,
  LicenceUpdatePayload,
  updateLicence,
} from "@/app/services/officelicence";

export function useDeleteOfficeLicence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLicence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useCreateOfficeLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLicence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useUpdateOfficeLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LicenceUpdatePayload }) =>
      updateLicence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}
