import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { useLogs, useOcrStats } from "@/app/hooks/useLogs";
import type { LogEntry, OcrStat } from "@/app/services/logs";
import { restoreLog } from "@/app/services/logs";
import { useUsers } from "@/app/hooks/useUser";
import { UserTable } from "@/app/components/user/UserTable";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, RotateCcw } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const ACTION_STYLE: Record<string, string> = {
  creation:     "bg-green-100 text-green-800",
  modification: "bg-blue-100 text-blue-800",
  suppression:  "bg-red-100 text-red-800",
};

const TABLE_LABELS: Record<string, string> = {
  ordinateurs:  "Ordinateurs",
  ecrans:       "Écrans",
  agents:       "Agents",
  licences:     "Licences",
  documents:    "Documents",
  utilisateurs: "Utilisateurs",
};

// ─── OCR columns (static — no actions needed) ────────────────────────────────

const ocrColumns: ColumnDef<OcrStat>[] = [
  {
    accessorKey: "timestamp",
    header: "Date / heure",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {fmtDate(getValue() as string)}
      </span>
    ),
  },
  {
    accessorKey: "nom_fichier",
    header: "Fichier",
    cell: ({ getValue }) => (
      <span className="max-w-[200px] truncate block text-xs" title={getValue() as string}>
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "type_document",
    header: "Type document",
    cell: ({ getValue }) => (
      <Badge variant="outline" className="text-xs">{getValue() as string}</Badge>
    ),
  },
  { accessorKey: "nb_pages", header: "Pages" },
  {
    id: "champs",
    header: "Champs extraits",
    cell: ({ row }) =>
      `${row.original.nb_champs_extraits} / ${row.original.nb_champs_extraits + row.original.nb_champs_vides}`,
  },
  {
    accessorKey: "taux_completude",
    header: "Complétude",
    cell: ({ getValue }) => {
      const pct = Math.round((getValue() as number) * 100);
      const color = pct >= 70 ? "text-green-700" : pct >= 40 ? "text-amber-600" : "text-red-600";
      return <span className={`font-medium ${color}`}>{pct}%</span>;
    },
  },
  {
    accessorKey: "duree_ms",
    header: "Durée",
    cell: ({ getValue }) => `${getValue() as number} ms`,
  },
  {
    accessorKey: "taille_fichier",
    header: "Taille",
    cell: ({ getValue }) => fmtSize(getValue() as number),
  },
  {
    accessorKey: "succes",
    header: "Statut",
    cell: ({ getValue }) =>
      getValue() ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Succès</Badge>
      ) : (
        <Badge variant="destructive">Échec</Badge>
      ),
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function Administration() {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const { data: logs = [], isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useLogs({ limit: 500 });
  const { data: ocrStats = [], isLoading: ocrLoading } = useOcrStats({ limit: 500 });
  const { data: users = [], isLoading: usersLoading } = useUsers();

  const handleRestore = async (log: LogEntry) => {
    if (!confirm(`Restaurer l'élément supprimé (${TABLE_LABELS[log.table_cible] ?? log.table_cible} #${log.item_id}) ?`)) return;
    setRestoringId(log.id);
    try {
      await restoreLog(log.id);
      toast.success("Élément restauré avec succès");
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    } catch {
      toast.error("Échec de la restauration");
    } finally {
      setRestoringId(null);
    }
  };

  const logColumns = useMemo<ColumnDef<LogEntry>[]>(() => [
    {
      accessorKey: "timestamp",
      header: "Date / heure",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {fmtDate(getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ getValue }) => {
        const action = getValue() as string;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_STYLE[action] ?? "bg-gray-100 text-gray-700"}`}>
            {action}
          </span>
        );
      },
    },
    {
      accessorKey: "table_cible",
      header: "Table",
      cell: ({ getValue }) => TABLE_LABELS[getValue() as string] ?? (getValue() as string),
    },
    {
      accessorKey: "item_id",
      header: "ID",
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return v != null ? <span className="font-mono text-xs">{v}</span> : "—";
      },
    },
    {
      accessorKey: "detail",
      header: "Détail",
      cell: ({ row }) => {
        const v = row.original.detail;
        if (!v) return <span className="text-muted-foreground">—</span>;
        // If it's a JSON object (suppression logs), show a summary instead of the raw JSON
        if (v.startsWith("{") || v.startsWith("[")) {
          try {
            const parsed = JSON.parse(v);
            const label = parsed.tag ?? parsed.nom ?? parsed.clef ?? parsed.numero ?? null;
            return <span className="text-xs text-muted-foreground italic">{label ?? "données archivées"}</span>;
          } catch {
            return <span className="text-xs">{v}</span>;
          }
        }
        return <span className="text-xs">{v}</span>;
      },
    },
    {
      accessorKey: "user_id",
      header: "Utilisateur",
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return v != null ? <span className="font-mono text-xs">#{v}</span> : "—";
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.action !== "suppression") return null;
        const isRestoring = restoringId === entry.id;
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isRestoring}
            onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}
          >
            <RotateCcw className={`w-3 h-3 mr-1 ${isRestoring ? "animate-spin" : ""}`} />
            Restaurer
          </Button>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [restoringId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestion des utilisateurs, journaux d'activité et statistiques OCR</p>
      </div>

      <Tabs defaultValue="utilisateurs">
        <TabsList>
          <TabsTrigger value="utilisateurs">
            Utilisateurs
            {users.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({users.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs">
            Logs d'activité
            {logs.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({logs.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ocr">
            Statistiques OCR
            {ocrStats.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({ocrStats.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="utilisateurs" className="mt-4">
          {usersLoading
            ? <p className="text-sm text-muted-foreground">Chargement…</p>
            : <UserTable data={users} />
          }
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => refetchLogs()} disabled={logsLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${logsLoading ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : logsError ? (
            <p className="text-sm text-red-500">Impossible de charger les logs. Vérifiez vos droits ou réessayez.</p>
          ) : (
            <DataTable
              data={logs}
              columns={logColumns}
              searchPlaceholder="Rechercher dans les logs…"
              itemLabel="entrées"
            />
          )}
        </TabsContent>

        <TabsContent value="ocr" className="mt-4">
          {ocrLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <DataTable
              data={ocrStats}
              columns={ocrColumns}
              searchPlaceholder="Rechercher un fichier…"
              itemLabel="analyses"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
