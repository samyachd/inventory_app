import { useMemo } from "react";
import {
  Monitor,
  MonitorSmartphone,
  KeyRound,
  Mail,
  Phone,
  Wifi,
  Headphones,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type {
  Agent,
  Ecran,
  OfficeLicence,
  Ordinateur,
} from "@/app/types";

interface Props {
  agent: Agent | null;
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
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
}: {
  Icon: typeof Monitor;
  title: string;
  count: number;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`rounded p-1.5 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <span className="text-xs text-muted-foreground">({count})</span>
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

export function AgentMaterialDialog({
  agent,
  ordinateurs,
  ecrans,
  licences,
  onOpenChange,
}: Props) {
  const data = useMemo(() => {
    if (!agent) {
      return { ordis: [], ecrs: [], lics: [] };
    }
    const ordis = ordinateurs.filter((o) => o.agent_id === agent.id);
    const ecrs = ecrans.filter((e) => e.agent_id === agent.id);
    const licenceIds = new Set(
      ordis
        .map((o) => o.officelicence_id)
        .filter((id): id is number => id != null)
    );
    const lics = licences.filter((l) => licenceIds.has(l.id));
    return { ordis, ecrs, lics };
  }, [agent, ordinateurs, ecrans, licences]);

  return (
    <Dialog open={agent != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl! w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            Matériel attribué à {agent?.nom ?? ""}
          </DialogTitle>
          <DialogDescription>
            Vue agrégée des ordinateurs, écrans et licences Office liés à cet
            agent.
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
            <TableWrap empty={data.lics.length === 0}>
              <thead className="bg-gray-50">
                <tr>
                  <Th>Version</Th>
                  <Th>Type</Th>
                  <Th>Fournisseur</Th>
                  <Th>Mail activation</Th>
                  <Th>Date achat</Th>
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
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
