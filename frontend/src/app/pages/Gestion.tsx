import { useState } from "react";
import { useForm } from "react-hook-form";
import { Lock, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { useTables, useCreateTable, useColumns, useAddColumn, useRenameColumn, useDropColumn } from "@/app/hooks/useSchema";
import { COLUMN_TYPES, type ColumnInfo, type AddColumnPayload, type CreateTablePayload } from "@/app/services/schema";

// ─── Known table labels ───────────────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  ordinateur:    "Ordinateurs",
  ecran:         "Écrans",
  agent:         "Agents",
  office_licence: "Licences",
  document:      "Documents",
};

function tableLabel(name: string): string {
  return TABLE_LABELS[name] ?? name;
}

// ─── New table dialog ─────────────────────────────────────────────────────────

function NewTableDialog({ onCreated }: { onCreated: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const createTable = useCreateTable();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTablePayload>({
    defaultValues: { name: "" },
  });

  const onSubmit = (data: CreateTablePayload) => {
    createTable.mutate(data, {
      onSuccess: () => {
        toast.success(`Table « ${data.name} » créée`);
        reset();
        setOpen(false);
        onCreated(data.name);
      },
      onError: (e: unknown) => {
        const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error(detail ?? "Erreur lors de la création");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle table
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une nouvelle table</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="table-name">Nom *</Label>
            <Input
              id="table-name"
              placeholder="nom_table"
              {...register("name", {
                required: "Le nom est obligatoire",
                pattern: { value: /^[a-z][a-z0-9_]*$/, message: "Minuscules, chiffres et underscores uniquement" },
              })}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              La table sera créée avec les colonnes <code>id</code>, <code>created_at</code> et <code>updated_at</code>.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createTable.isPending}>
              {createTable.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add column dialog ────────────────────────────────────────────────────────

function AddColumnDialog({ table }: { table: string }) {
  const [open, setOpen] = useState(false);
  const addColumn = useAddColumn(table);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddColumnPayload>({
    defaultValues: { name: "", type: "text", nullable: true, default: null },
  });

  const onSubmit = (data: AddColumnPayload) => {
    addColumn.mutate(
      { ...data, default: data.default || null },
      {
        onSuccess: () => {
          toast.success(`Colonne « ${data.name} » ajoutée`);
          reset();
          setOpen(false);
        },
        onError: (e: unknown) => {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          toast.error(detail ?? "Erreur lors de l'ajout");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle colonne
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une colonne</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="col-name">Nom *</Label>
            <Input
              id="col-name"
              placeholder="nom_colonne"
              {...register("name", {
                required: "Le nom est obligatoire",
                pattern: { value: /^[a-z][a-z0-9_]*$/, message: "Minuscules, chiffres et underscores uniquement" },
              })}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="col-type">Type *</Label>
            <select
              id="col-type"
              {...register("type")}
              className="w-full h-9 border rounded px-3 text-sm bg-white"
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input id="col-nullable" type="checkbox" {...register("nullable")} defaultChecked className="accent-blue-600" />
            <Label htmlFor="col-nullable">Valeur nulle autorisée</Label>
          </div>

          <div>
            <Label htmlFor="col-default">Valeur par défaut <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <Input id="col-default" placeholder="ex : 0, '', false…" {...register("default")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={addColumn.isPending}>
              {addColumn.isPending ? "Ajout…" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rename inline ────────────────────────────────────────────────────────────

function RenameCell({ table, column }: { table: string; column: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(column);
  const rename = useRenameColumn(table);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === column) { setEditing(false); setValue(column); return; }
    rename.mutate(
      { column, newName: trimmed },
      {
        onSuccess: () => { toast.success(`Renommé en « ${trimmed} »`); setEditing(false); },
        onError: (e: unknown) => {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          toast.error(detail ?? "Erreur lors du renommage");
          setValue(column);
          setEditing(false);
        },
      }
    );
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(column); } }}
          className="h-7 text-sm w-40"
        />
        <button onClick={commit} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
        <button onClick={() => { setEditing(false); setValue(column); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="font-mono text-sm">{column}</span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Column row ───────────────────────────────────────────────────────────────

function ColumnRow({ col, table }: { col: ColumnInfo; table: string }) {
  const drop = useDropColumn(table);

  const handleDelete = () => {
    if (!confirm(`Supprimer définitivement la colonne « ${col.name} » ? Cette action est irréversible.`)) return;
    drop.mutate(col.name, {
      onSuccess: () => toast.success(`Colonne « ${col.name} » supprimée`),
      onError: (e: unknown) => {
        const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error(detail ?? "Erreur lors de la suppression");
      },
    });
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-b last:border-0 hover:bg-gray-50 group">
      <div className="w-6 shrink-0">
        {col.protected && <Lock className="w-3.5 h-3.5 text-gray-400" />}
      </div>

      <div className="flex-1 min-w-0">
        {col.protected
          ? <span className="font-mono text-sm text-muted-foreground">{col.name}</span>
          : <RenameCell table={table} column={col.name} />
        }
      </div>

      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0">
        {col.type}
      </span>

      <span className={`text-xs shrink-0 ${col.nullable ? "text-gray-400" : "text-orange-600 font-medium"}`}>
        {col.nullable ? "nullable" : "obligatoire"}
      </span>

      <div className="w-8 shrink-0 flex justify-end">
        {!col.protected && (
          <button
            onClick={handleDelete}
            disabled={drop.isPending}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Table schema panel ───────────────────────────────────────────────────────

function SchemaPanel({ table }: { table: string }) {
  const { data: columns = [], isLoading, isError } = useColumns(table);

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  if (isError)   return <p className="text-sm text-red-500 py-8 text-center">Erreur de chargement du schéma.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{columns.length} colonne{columns.length > 1 ? "s" : ""}</p>
        <AddColumnDialog table={table} />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="w-6 shrink-0" />
          <div className="flex-1">Nom</div>
          <div className="shrink-0 w-32 text-center">Type</div>
          <div className="shrink-0 w-20 text-center">Nullable</div>
          <div className="w-8 shrink-0" />
        </div>
        {columns.map((col) => (
          <ColumnRow key={col.name} col={col} table={table} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABLE_ORDER = ["agent", "ordinateur", "ecran", "office_licence", "document"];

function sortTables(tables: string[]): string[] {
  const rank = (name: string) => {
    const i = TABLE_ORDER.indexOf(name);
    return i === -1 ? TABLE_ORDER.length : i;
  };
  return [...tables].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function Gestion() {
  const { data: rawTables = [], isLoading, isError } = useTables();
  const tables = sortTables(rawTables);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const currentTab = activeTab ?? tables[0];

  if (isLoading) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion</h1>
        <p className="text-sm text-muted-foreground mt-1">Chargement…</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion</h1>
        <p className="text-sm text-red-500 mt-1">Erreur de chargement des tables.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez la structure des tables — ajoutez, renommez ou supprimez des colonnes.
          </p>
        </div>
        <NewTableDialog onCreated={(name) => setActiveTab(name)} />
      </div>

      {tables.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune table disponible.</p>
      ) : (
        <Tabs value={currentTab} onValueChange={setActiveTab}>
          <TabsList>
            {tables.map((t) => (
              <TabsTrigger key={t} value={t}>{tableLabel(t)}</TabsTrigger>
            ))}
          </TabsList>

          {tables.map((t) => (
            <TabsContent key={t} value={t} className="mt-6">
              {currentTab === t && <SchemaPanel table={t} />}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
