import { useMemo, useState } from "react";
import {
  Monitor,
  MonitorSmartphone,
  KeyRound,
  Mail,
  Phone,
  Wifi,
  Headphones,
  Pencil,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type {
  Agent,
  Document as DocumentT,
  Ecran,
  OfficeLicence,
  Ordinateur,
} from "@/app/types";
import { useUpdateOrdinateur } from "@/app/hooks/useOrdinateur";
import { useUpdateEcran } from "@/app/hooks/useEcran";
import { OrdinateurEditDialog } from "../ordinateur/OrdinateurEditDialog";
import { EcranEditDialog } from "../ecran/EcranEditDialog";
import { OfficeLicenceEditDialog } from "../officelicence/OfficeLicenceEditDialog";

interface Props {
  agent: Agent | null;
  agents: Agent[];
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
  documents: DocumentT[];
  onOpenChange: (open: boolean) => void;
}

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("fr-FR") : "—";
const str = (v: string | null | undefined) => v ?? "—";
const num = (v: number | null | undefined) =>
  v != null ? String(v) : "—";
const bool = (v: boolean | null | undefined) =>
  v == null ? "—" : v ? "Oui" : "Non";

function SectionHeader({
  Icon,
  title,
  count,
  iconClass,
  right,
}: {
  Icon: typeof Monitor;
  title: string;
  count: number;
  iconClass: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`rounded p-1.5 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <span className="text-xs text-muted-foreground">({count})</span>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 ${mono ? "font-mono text-xs" : ""}`}>
      {children}
    </td>
  );
}

function TableWrap({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-lg border px-3 py-4 text-sm text-muted-foreground text-center bg-gray-50">
        Aucun élément.
      </div>
    );
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  iconClass,
}: {
  Icon: typeof Monitor;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="bg-white border rounded-lg px-3 py-2.5 flex items-center gap-3">
      <div className={`rounded-md p-2 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xl font-semibold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function AgentInfoPill({
  Icon,
  children,
}: {
  Icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  );
}

function RowActions({
  onEdit,
  onRemove,
  removeLabel = "Retirer de cet agent",
}: {
  onEdit: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        type="button"
        onClick={onEdit}
        className="text-gray-400 hover:text-blue-600 p-1 rounded transition"
        title="Modifier"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 p-1 rounded transition"
          title={removeLabel}
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const ASSIGN_SELECT_CLS =
  "h-8 text-xs border rounded-md px-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 max-w-[16rem]";

export function AgentMaterialDialog({
  agent,
  agents,
  ordinateurs,
  ecrans,
  licences,
  documents,
  onOpenChange,
}: Props) {
  const updateOrdi = useUpdateOrdinateur();
  const updateEcran = useUpdateEcran();

  const [editingOrdi, setEditingOrdi] = useState<Ordinateur | null>(null);
  const [editingEcran, setEditingEcran] = useState<Ecran | null>(null);
  const [editingLicence, setEditingLicence] = useState<OfficeLicence | null>(null);
  // The native <select>'s value resets to "" after every assign mutation, so we
  // re-render it with a fresh key to force the placeholder back into view.
  const [ordSelectKey, setOrdSelectKey] = useState(0);
  const [ecrSelectKey, setEcrSelectKey] = useState(0);

  const data = useMemo(() => {
    if (!agent) {
      return { ordis: [], ecrs: [], lics: [], ordisAvail: [], ecrsAvail: [] };
    }
    const ordis = ordinateurs.filter((o) => o.agent_id === agent.id);
    const ecrs = ecrans.filter((e) => e.agent_id === agent.id);
    const licenceIds = new Set(
      ordis
        .map((o) => o.officelicence_id)
        .filter((id): id is number => id != null)
    );
    const lics = licences.filter((l) => licenceIds.has(l.id));
    const ordisAvail = ordinateurs.filter((o) => o.agent_id !== agent.id);
    const ecrsAvail = ecrans.filter((e) => e.agent_id !== agent.id);
    return { ordis, ecrs, lics, ordisAvail, ecrsAvail };
  }, [agent, ordinateurs, ecrans, licences]);

  const agentNameById = useMemo(
    () => new Map(agents.map((a) => [a.id, a.nom])),
    [agents]
  );

  const labelEquip = (
    item: { id: number; tag: string | null; agent_id: number | null; marque: string | null }
  ): string => {
    const tag = item.tag ?? `#${item.id}`;
    const marque = item.marque ? ` — ${item.marque}` : "";
    if (item.agent_id == null) return `${tag}${marque} (libre)`;
    const owner = agentNameById.get(item.agent_id) ?? `agent #${item.agent_id}`;
    return `${tag}${marque} (assigné à ${owner})`;
  };

  const reassignOrdi = (ordiId: number) => {
    if (!agent || !ordiId) return;
    updateOrdi.mutate(
      { id: ordiId, data: { agent_id: agent.id } },
      {
        onSuccess: () => {
          toast.success("Ordinateur assigné");
          setOrdSelectKey((k) => k + 1);
        },
        onError: () => {
          toast.error("Échec de l'assignation");
          setOrdSelectKey((k) => k + 1);
        },
      }
    );
  };

  const removeOrdi = (o: Ordinateur) => {
    if (!confirm(`Retirer l'ordinateur ${o.tag ?? `#${o.id}`} de cet agent ?`))
      return;
    updateOrdi.mutate(
      { id: o.id, data: { agent_id: null } },
      {
        onSuccess: () => toast.success("Ordinateur retiré"),
        onError: () => toast.error("Échec du retrait"),
      }
    );
  };

  const reassignEcran = (ecranId: number) => {
    if (!agent || !ecranId) return;
    updateEcran.mutate(
      { id: ecranId, data: { agent_id: agent.id } },
      {
        onSuccess: () => {
          toast.success("Écran assigné");
          setEcrSelectKey((k) => k + 1);
        },
        onError: () => {
          toast.error("Échec de l'assignation");
          setEcrSelectKey((k) => k + 1);
        },
      }
    );
  };

  const removeEcran = (e: Ecran) => {
    if (!confirm(`Retirer l'écran ${e.tag ?? `#${e.id}`} de cet agent ?`)) return;
    updateEcran.mutate(
      { id: e.id, data: { agent_id: null } },
      {
        onSuccess: () => toast.success("Écran retiré"),
        onError: () => toast.error("Échec du retrait"),
      }
    );
  };

  const assignOrdiControl = (
    <select
      key={ordSelectKey}
      className={ASSIGN_SELECT_CLS}
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value;
        if (v) reassignOrdi(Number(v));
      }}
    >
      <option value="">+ Assigner un ordinateur…</option>
      {data.ordisAvail.map((o) => (
        <option key={o.id} value={o.id}>
          {labelEquip(o)}
        </option>
      ))}
    </select>
  );

  const assignEcranControl = (
    <select
      key={ecrSelectKey}
      className={ASSIGN_SELECT_CLS}
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value;
        if (v) reassignEcran(Number(v));
      }}
    >
      <option value="">+ Assigner un écran…</option>
      {data.ecrsAvail.map((ec) => (
        <option key={ec.id} value={ec.id}>
          {labelEquip(ec)}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <Dialog open={agent != null} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl! w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              Matériel attribué à {agent?.nom ?? ""}
            </DialogTitle>
            <DialogDescription>
              Cliquez sur ✏️ pour modifier, × pour retirer, ou utilisez les
              sélecteurs pour assigner de nouveaux équipements.
            </DialogDescription>
          </DialogHeader>

          {agent && (
            <div className="flex flex-wrap items-center gap-4 -mt-2">
              {agent.email && (
                <AgentInfoPill Icon={Mail}>{agent.email}</AgentInfoPill>
              )}
              {agent.telephone && (
                <AgentInfoPill Icon={Phone}>{agent.telephone}</AgentInfoPill>
              )}
              <AgentInfoPill Icon={Wifi}>
                Clef WiFi&nbsp;: <strong>{bool(agent.clef_wifi)}</strong>
              </AgentInfoPill>
              <AgentInfoPill Icon={Headphones}>
                Casque&nbsp;: <strong>{bool(agent.casque)}</strong>
              </AgentInfoPill>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <StatCard
              Icon={Monitor}
              label="Ordinateurs"
              value={data.ordis.length}
              iconClass="bg-blue-50 text-blue-700"
            />
            <StatCard
              Icon={MonitorSmartphone}
              label="Écrans"
              value={data.ecrs.length}
              iconClass="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              Icon={KeyRound}
              label="Licences"
              value={data.lics.length}
              iconClass="bg-amber-50 text-amber-700"
            />
          </div>

          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {/* Ordinateurs */}
            <section>
              <SectionHeader
                Icon={Monitor}
                title="Ordinateurs"
                count={data.ordis.length}
                iconClass="bg-blue-50 text-blue-700"
                right={assignOrdiControl}
              />
              <TableWrap empty={data.ordis.length === 0}>
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Tag</Th>
                    <Th>Type</Th>
                    <Th>Marque</Th>
                    <Th>OS</Th>
                    <Th>RAM</Th>
                    <Th>Nom réseau</Th>
                    <Th>IP</Th>
                    <Th>Service</Th>
                    <Th>Bâtiment</Th>
                    <Th>Date achat</Th>
                    <Th>Fin garantie</Th>
                    <Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.ordis.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <Td mono>{str(o.tag)}</Td>
                      <Td>{str(o.type_equipement)}</Td>
                      <Td>{str(o.marque)}</Td>
                      <Td>{str(o.os)}</Td>
                      <Td>{str(o.ram)}</Td>
                      <Td>{str(o.nom_reseau)}</Td>
                      <Td mono>{str(o.ip_address)}</Td>
                      <Td>{str(o.service)}</Td>
                      <Td>{str(o.batiment)}</Td>
                      <Td>{fmtDate(o.date_achat)}</Td>
                      <Td>{fmtDate(o.fin_garantie)}</Td>
                      <Td>
                        <RowActions
                          onEdit={() => setEditingOrdi(o)}
                          onRemove={() => removeOrdi(o)}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </section>

            {/* Écrans */}
            <section>
              <SectionHeader
                Icon={MonitorSmartphone}
                title="Écrans"
                count={data.ecrs.length}
                iconClass="bg-emerald-50 text-emerald-700"
                right={assignEcranControl}
              />
              <TableWrap empty={data.ecrs.length === 0}>
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Tag</Th>
                    <Th>Marque</Th>
                    <Th>Taille (")</Th>
                    <Th>Service</Th>
                    <Th>Bâtiment</Th>
                    <Th>Fournisseur</Th>
                    <Th>Date achat</Th>
                    <Th>Fin garantie</Th>
                    <Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.ecrs.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-gray-50">
                      <Td mono>{str(e.tag)}</Td>
                      <Td>{str(e.marque)}</Td>
                      <Td>{num(e.taille)}</Td>
                      <Td>{str(e.service)}</Td>
                      <Td>{str(e.batiment)}</Td>
                      <Td>{str(e.fournisseur)}</Td>
                      <Td>{fmtDate(e.date_achat)}</Td>
                      <Td>{fmtDate(e.fin_garantie)}</Td>
                      <Td>
                        <RowActions
                          onEdit={() => setEditingEcran(e)}
                          onRemove={() => removeEcran(e)}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </section>

            {/* Licences */}
            <section>
              <SectionHeader
                Icon={KeyRound}
                title="Licences Office"
                count={data.lics.length}
                iconClass="bg-amber-50 text-amber-700"
              />
              <p className="text-xs text-muted-foreground -mt-1 mb-2">
                Les licences sont héritées via les ordinateurs de l'agent.
                Pour rattacher/détacher une licence, modifiez l'ordinateur
                concerné.
              </p>
              <TableWrap empty={data.lics.length === 0}>
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Version</Th>
                    <Th>Type</Th>
                    <Th>Fournisseur</Th>
                    <Th>Mail activation</Th>
                    <Th>Date achat</Th>
                    <Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.lics.map((l) => (
                    <tr key={l.id} className="border-t hover:bg-gray-50">
                      <Td>{str(l.version)}</Td>
                      <Td>{str(l.type_licence)}</Td>
                      <Td>{str(l.fournisseur)}</Td>
                      <Td mono>{str(l.mail_activation)}</Td>
                      <Td>{fmtDate(l.date_achat)}</Td>
                      <Td>
                        <RowActions onEdit={() => setEditingLicence(l)} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {editingOrdi && (
        <OrdinateurEditDialog
          ordinateur={editingOrdi}
          agents={agents}
          documents={documents}
          open
          onOpenChange={(o) => {
            if (!o) setEditingOrdi(null);
          }}
        />
      )}
      {editingEcran && (
        <EcranEditDialog
          ecran={editingEcran}
          agents={agents}
          documents={documents}
          open
          onOpenChange={(o) => {
            if (!o) setEditingEcran(null);
          }}
        />
      )}
      {editingLicence && (
        <OfficeLicenceEditDialog
          licence={editingLicence}
          documents={documents}
          open
          onOpenChange={(o) => {
            if (!o) setEditingLicence(null);
          }}
        />
      )}
    </>
  );
}
