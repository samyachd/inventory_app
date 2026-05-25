import { useMemo, useState } from "react";
import { Monitor, MonitorSmartphone, KeyRound, Search, X } from "lucide-react";
import { useInventaire } from "@/app/hooks/useInventaire";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Input } from "@/app/components/ui/input";
import { OrdinateurTable } from "@/app/components/ordinateur/OrdinateurTable";
import { OfficeLicenceTable } from "@/app/components/officelicence/OfficeLicenceTable";
import { EcranTable } from "../components/ecran/EcranTable";
import { AgentTable } from "../components/agent/AgentTable";
import { DocumentTable } from "../components/document/DocumentTable";

// Same matching semantics as DataTable's multiWordFilter.
function matchesQuery(item: object, query: string): boolean {
  const raw = query.trim();
  if (!raw) return true;
  const haystack = Object.values(item)
    .map((v) => (v == null ? "" : String(v)))
    .join(" ")
    .toLowerCase();
  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return segments.some((segment) => {
    const terms = segment.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every((t) => haystack.includes(t));
  });
}

function substringMatch(value: string | null | undefined, q: string): boolean {
  if (!q) return true;
  return (value ?? "").toLowerCase().includes(q.toLowerCase());
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) if (v) set.add(v);
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

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
    <div className="flex items-center gap-2 mb-3">
      <div className={`rounded p-1.5 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-semibold text-lg">{title}</h2>
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );
}

function SectionChip({
  active,
  Icon,
  label,
  onClick,
  activeCls,
}: {
  active: boolean;
  Icon: typeof Monitor;
  label: string;
  onClick: () => void;
  activeCls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        active
          ? activeCls
          : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

const SELECT_CLS =
  "h-9 border rounded-md px-2 text-sm bg-white min-w-[8rem] focus:outline-none focus:ring-2 focus:ring-blue-200";

export function Inventaire() {
  const { data, isLoading, isError, error } = useInventaire();
  const [tab, setTab] = useState("agents");

  // Material filters
  const [search, setSearch] = useState("");
  const [showOrd, setShowOrd] = useState(true);
  const [showEcr, setShowEcr] = useState(true);
  const [showLic, setShowLic] = useState(true);
  const [agentId, setAgentId] = useState("");
  const [service, setService] = useState("");
  const [marque, setMarque] = useState("");

  const serviceOptions = useMemo(
    () =>
      uniqueSorted([
        ...(data?.ordinateurs ?? []).map((o) => o.service),
        ...(data?.ecrans ?? []).map((e) => e.service),
      ]),
    [data?.ordinateurs, data?.ecrans]
  );
  const marqueOptions = useMemo(
    () =>
      uniqueSorted([
        ...(data?.ordinateurs ?? []).map((o) => o.marque),
        ...(data?.ecrans ?? []).map((e) => e.marque),
      ]),
    [data?.ordinateurs, data?.ecrans]
  );

  const matFiltered = useMemo(() => {
    if (!data) return null;
    const numericAgent = agentId === "" ? null : Number(agentId);

    const ords = !showOrd
      ? []
      : data.ordinateurs.filter(
          (o) =>
            matchesQuery(o, search) &&
            (numericAgent == null || o.agent_id === numericAgent) &&
            substringMatch(o.service, service) &&
            substringMatch(o.marque, marque)
        );

    const ecrs = !showEcr
      ? []
      : data.ecrans.filter(
          (e) =>
            matchesQuery(e, search) &&
            (numericAgent == null || e.agent_id === numericAgent) &&
            substringMatch(e.service, service) &&
            substringMatch(e.marque, marque)
        );

    // Licences have no service/marque/agent → exclude if any field filter is set.
    const licsExcluded =
      !showLic || numericAgent != null || service !== "" || marque !== "";
    const lics = licsExcluded
      ? []
      : data.licences.filter((l) => matchesQuery(l, search));

    return { ordinateurs: ords, ecrans: ecrs, licences: lics };
  }, [data, search, showOrd, showEcr, showLic, agentId, service, marque]);

  if (isLoading) return <div className="p-6">Chargement...</div>;
  if (isError) {
    return (
      <div className="p-6 text-red-600">
        Erreur : {error instanceof Error ? error.message : "inconnue"}
      </div>
    );
  }
  if (!data || !matFiltered) return null;

  const matTotal =
    matFiltered.ordinateurs.length +
    matFiltered.ecrans.length +
    matFiltered.licences.length;
  const matTotalAll =
    data.ordinateurs.length + data.ecrans.length + data.licences.length;

  const hasActiveFilter =
    search.trim() !== "" ||
    !showOrd ||
    !showEcr ||
    !showLic ||
    agentId !== "" ||
    service !== "" ||
    marque !== "";

  const clearAll = () => {
    setSearch("");
    setShowOrd(true);
    setShowEcr(true);
    setShowLic(true);
    setAgentId("");
    setService("");
    setMarque("");
  };

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-2xl font-semibold mb-4 sm:mb-6">Inventaire</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex overflow-x-auto w-full sm:inline-flex sm:w-auto">
          <TabsTrigger value="agents">
            Agents ({data.agents.length})
          </TabsTrigger>
          <TabsTrigger value="materiel">
            Matériel ({data.ordinateurs.length + data.ecrans.length + data.licences.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({data.documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materiel" className="mt-6 space-y-6">
          {tab === "materiel" && (
            <>
              <div className="bg-white border rounded-lg p-3 space-y-3">
                {/* Free-text search */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 sm:max-w-md">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher dans le matériel…"
                      className="pl-9 pr-9"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Effacer la recherche"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {matTotal} / {matTotalAll}
                  </span>
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="ml-auto text-xs text-blue-600 hover:underline"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                {/* Section toggles */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">
                    Sections :
                  </span>
                  <SectionChip
                    active={showOrd}
                    Icon={Monitor}
                    label="Ordinateurs"
                    onClick={() => setShowOrd((v) => !v)}
                    activeCls="bg-blue-50 text-blue-700 border-blue-200"
                  />
                  <SectionChip
                    active={showEcr}
                    Icon={MonitorSmartphone}
                    label="Écrans"
                    onClick={() => setShowEcr((v) => !v)}
                    activeCls="bg-emerald-50 text-emerald-700 border-emerald-200"
                  />
                  <SectionChip
                    active={showLic}
                    Icon={KeyRound}
                    label="Licences"
                    onClick={() => setShowLic((v) => !v)}
                    activeCls="bg-amber-50 text-amber-700 border-amber-200"
                  />
                </div>

                {/* Field filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">
                    Filtres :
                  </span>
                  <select
                    className={SELECT_CLS}
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="">Agent : tous</option>
                    {data.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                  <select
                    className={SELECT_CLS}
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                  >
                    <option value="">Service : tous</option>
                    {serviceOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    className={SELECT_CLS}
                    value={marque}
                    onChange={(e) => setMarque(e.target.value)}
                  >
                    <option value="">Marque : toutes</option>
                    {marqueOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showOrd && (
                <section>
                  <SectionHeader
                    Icon={Monitor}
                    title="Ordinateurs"
                    count={matFiltered.ordinateurs.length}
                    iconClass="bg-blue-50 text-blue-700"
                  />
                  <OrdinateurTable
                    data={matFiltered.ordinateurs}
                    agents={data.agents}
                    documents={data.documents}
                    licences={data.licences}
                    hideSearch
                  />
                </section>
              )}

              {showEcr && (
                <section>
                  <SectionHeader
                    Icon={MonitorSmartphone}
                    title="Écrans"
                    count={matFiltered.ecrans.length}
                    iconClass="bg-emerald-50 text-emerald-700"
                  />
                  <EcranTable
                    data={matFiltered.ecrans}
                    agents={data.agents}
                    documents={data.documents}
                    hideSearch
                  />
                </section>
              )}

              {showLic && (
                <section>
                  <SectionHeader
                    Icon={KeyRound}
                    title="Licences Office"
                    count={matFiltered.licences.length}
                    iconClass="bg-amber-50 text-amber-700"
                  />
                  <OfficeLicenceTable
                    data={matFiltered.licences}
                    documents={data.documents}
                    hideSearch
                  />
                </section>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          {tab === "documents" && (
            <DocumentTable
              data={data.documents}
              ordinateurs={data.ordinateurs}
              ecrans={data.ecrans}
              licences={data.licences}
            />
          )}
        </TabsContent>
        <TabsContent value="agents" className="mt-6">
          {tab === "agents" && (
            <AgentTable
              data={data.agents}
              ordinateurs={data.ordinateurs}
              ecrans={data.ecrans}
              licences={data.licences}
              documents={data.documents}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
