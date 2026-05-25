import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDocument,
  deleteDocument,
  updateDocument,
  type DocumentUpdatePayload,
} from "@/app/services/document";

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocumentUpdatePayload }) =>
      updateDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}
