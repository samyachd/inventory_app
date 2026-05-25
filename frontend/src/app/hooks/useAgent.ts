import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteAgent,
  createAgent,
  updateAgent,
  type AgentPayload,
} from "@/app/services/agent";

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AgentPayload }) =>
      updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}