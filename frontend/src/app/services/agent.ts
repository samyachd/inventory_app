// services/agent.ts
import api from "./api";
import type { Agent } from "@/app/types";


export interface AgentPayload {
  nom: string;
  email: string | null;
  telephone: string | null;
  clef_wifi: boolean | null;
  casque: boolean | null;
}

export async function deleteAgent(id: number): Promise<void> {
  await api.delete(`/agents/${id}`);
}

export async function createAgent(data: AgentPayload): Promise<Agent> {
  const response = await api.post<Agent>("/agents/", data);
  return response.data;
}

export async function updateAgent(
  id: number,
  data: AgentPayload
): Promise<Agent> {
  const response = await api.put<Agent>(`/agents/${id}/`, data);
  return response.data;
}
