import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AdminConfig = {
  holoEnv: string | null;
  ownerInbox: string;
  ownerInboxExists: boolean;
  defaultOwnerInbox: string;
};

type ArtifactPointerEntry = {
  id: string;
  pointerRel: string;
  siblingRel: string | null;
  sha256: string | null;
  mime: string | null;
  size: number | null;
  timestamp: string | null;
  receipts: {
    verified: boolean;
    diffViewed: boolean;
    hilApproved: boolean;
  };
};

type VerifyResult =
  | {
      ok: true;
      id: string;
      pointerRel: string;
      siblingRel: string;
      wantSha256: string;
      gotSha256: string;
      receiptRel: string;
    }
  | {
      ok: false;
      id: string;
      pointerRel: string;
      siblingRel: string | null;
      wantSha256: string | null;
      gotSha256: string | null;
      error: string;
    };

type DiffResult = {
  aRel: string;
  bRel: string;
  aText: string;
  bText: string;
  receiptRel: string;
};

type HilQueueItem = {
  id: string;
  title: string;
  requestRel: string;
  pointerRel: string | null;
  diff: { aRel: string; bRel: string } | null;
  receipts: {
    verified: boolean;
    diffViewed: boolean;
    hilApproved: boolean;
    hilRejected: boolean;
  };
  gate: {
    canApprove: boolean;
    canReject: boolean;
    missing: string[];
  };
  error: string | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    let msg = res.statusText;
    if (typeof body === "object" && body) {
      const maybeError = (body as Record<string, unknown>).error;
      if (typeof maybeError === "string" && maybeError.trim()) msg = maybeError;
    }
    throw new Error(msg);
  }
  return body as T;
}

function shortPath(p: string) {
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 5) return p;
  return ["", parts[0], parts[1], "...", parts[parts.length - 2], parts[parts.length - 1]].join("/");
}

const Index = () => {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [pointers, setPointers] = useState<ArtifactPointerEntry[]>([]);
  const [hilItems, setHilItems] = useState<HilQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fileDialog, setFileDialog] = useState<{ title: string; text: string } | null>(null);
  const [diffDialog, setDiffDialog] = useState<DiffResult | null>(null);

  const [diffSelection, setDiffSelection] = useState<string[]>([]);
  const [tab, setTab] = useState<string>("command");

  const loadAll = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const cfg = await fetchJson<AdminConfig>("/api/admin/config");
      setConfig(cfg);
      const resp = await fetchJson<{ pointers: ArtifactPointerEntry[] }>("/api/inbox/pointers");
      setPointers(resp.pointers || []);
      const hil = await fetchJson<{ items: HilQueueItem[] }>("/api/hil/queue");
      setHilItems(hil.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const pointerCount = pointers.length;
  const verifiedCount = useMemo(() => pointers.filter((p) => p.receipts.verified).length, [pointers]);
  const diffViewedCount = useMemo(() => pointers.filter((p) => p.receipts.diffViewed).length, [pointers]);
  const pendingHilCount = useMemo(
    () => hilItems.filter((h) => !h.error && !h.receipts.hilApproved && !h.receipts.hilRejected).length,
    [hilItems],
  );

  useEffect(() => {
    if (pendingHilCount > 0 && tab === "command") setTab("hil");
  }, [pendingHilCount, tab]);

  const toggleDiffSel = (rel: string) => {
    setDiffSelection((prev) => {
      const s = new Set(prev);
      if (s.has(rel)) s.delete(rel);
      else s.add(rel);
      return Array.from(s).slice(0, 2);
    });
  };

  const canDiff = diffSelection.length === 2;

  const openFile = async (rel: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchJson<{ rel: string; text: string }>(`/api/inbox/file?rel=${encodeURIComponent(rel)}`);
      setFileDialog({ title: data.rel, text: data.text });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyOne = async (pointerRel: string) => {
    setBusy(true);
    setError(null);
    try {
      await fetchJson<VerifyResult>("/api/inbox/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pointerRel }),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openDiff = async () => {
    if (!canDiff) return;
    const [aRel, bRel] = diffSelection;
    setBusy(true);
    setError(null);
    try {
      const data = await fetchJson<DiffResult>("/api/inbox/diff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aRel, bRel }),
      });
      setDiffDialog(data);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openDiffPair = async (aRel: string, bRel: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchJson<DiffResult>("/api/inbox/diff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aRel, bRel }),
      });
      setDiffDialog(data);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const approveHil = async (requestRel: string) => {
    setBusy(true);
    setError(null);
    try {
      await fetchJson<{ ok: boolean }>("/api/hil/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestRel }),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const rejectHil = async (requestRel: string) => {
    setBusy(true);
    setError(null);
    try {
      await fetchJson<{ ok: boolean }>("/api/hil/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestRel }),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const diffRows = useMemo(() => {
    if (!diffDialog) return [];
    const aLines = diffDialog.aText.split("\n");
    const bLines = diffDialog.bText.split("\n");
    const max = Math.max(aLines.length, bLines.length);
    const rows: Array<{ i: number; a: string; b: string; changed: boolean }> = [];
    for (let i = 0; i < max; i += 1) {
      const a = aLines[i] ?? "";
      const b = bLines[i] ?? "";
      rows.push({ i: i + 1, a, b, changed: a !== b });
    }
    return rows;
  }, [diffDialog]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">HOLOSCOPE</h1>
            <p className="text-sm text-muted-foreground">
              Local evidence review UI. Owner inbox:{" "}
              <span className="font-mono text-foreground">
                {config ? shortPath(config.ownerInbox) : "loading"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadAll} disabled={busy}>
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="font-mono whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        ) : null}

        {!config ? null : !config.ownerInboxExists ? (
          <Alert variant="destructive">
            <AlertTitle>Owner Inbox Missing</AlertTitle>
            <AlertDescription className="font-mono">{config.ownerInbox}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-muted flex-wrap h-auto">
            <TabsTrigger value="command">Command Center</TabsTrigger>
            <TabsTrigger value="runs">Runs And Evidence</TabsTrigger>
            <TabsTrigger value="hil">{pendingHilCount > 0 ? `HIL Queue (${pendingHilCount})` : "HIL Queue"}</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="command" className="space-y-4">
            {pendingHilCount > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>HIL Pending</AlertTitle>
                <AlertDescription>There are pending items in the HIL queue. Review and approve or reject before promoting changes.</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Inbox Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exists</span>
                    <span className="font-mono">{config?.ownerInboxExists ? "yes" : "no"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pointers</span>
                    <span className="font-mono">{pointerCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gate Receipts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verified</span>
                    <span className="font-mono">{verifiedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diff Viewed</span>
                    <span className="font-mono">{diffViewedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HIL Pending</span>
                    <span className="font-mono">{pendingHilCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-muted-foreground">Pull artifacts into the owner inbox, then verify and review diffs.</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Artifact Pointers</CardTitle>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={openDiff} disabled={busy || !canDiff}>
                    Open Diff
                  </Button>
                  <Button variant="secondary" onClick={() => setDiffSelection([])} disabled={busy || diffSelection.length === 0}>
                    Clear Selection
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Diff</th>
                      <th className="py-2 pr-2">Id</th>
                      <th className="py-2 pr-2">Verified</th>
                      <th className="py-2 pr-2">Diff Viewed</th>
                      <th className="py-2 pr-2">Pointer</th>
                      <th className="py-2 pr-2">Artifact</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointers.map((p) => {
                      const selectable = Boolean(p.siblingRel);
                      const sel = p.siblingRel ? diffSelection.includes(p.siblingRel) : false;
                      return (
                        <tr key={p.pointerRel} className="border-t border-border">
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="checkbox"
                              disabled={!selectable}
                              checked={sel}
                              onChange={() => p.siblingRel && toggleDiffSel(p.siblingRel)}
                            />
                          </td>
                          <td className="py-2 pr-2 font-mono align-top">{p.id}</td>
                          <td className="py-2 pr-2 font-mono align-top">{p.receipts.verified ? "yes" : "no"}</td>
                          <td className="py-2 pr-2 font-mono align-top">{p.receipts.diffViewed ? "yes" : "no"}</td>
                          <td className="py-2 pr-2 font-mono align-top">{p.pointerRel}</td>
                          <td className="py-2 pr-2 font-mono align-top">{p.siblingRel ?? "missing"}</td>
                          <td className="py-2 pr-2 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="secondary" onClick={() => verifyOne(p.pointerRel)} disabled={busy}>
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => p.siblingRel && openFile(p.siblingRel)}
                                disabled={busy || !p.siblingRel}
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pointers.length === 0 ? (
                      <tr>
                        <td className="py-4 text-muted-foreground" colSpan={7}>
                          No pointers found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hil" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>HIL Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {hilItems.length === 0 ? (
                  <div className="text-muted-foreground">No HIL requests found.</div>
                ) : (
                  <div className="space-y-4">
                    {hilItems.map((h) => (
                      <div key={h.requestRel} className="rounded-md border border-border p-4 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-semibold">{h.title}</div>
                            <div className="font-mono text-xs text-muted-foreground">{h.id}</div>
                            <div className="font-mono text-xs text-muted-foreground">{h.requestRel}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => h.pointerRel && verifyOne(h.pointerRel)}
                              disabled={busy || !h.pointerRel || Boolean(h.error)}
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => h.diff && openDiffPair(h.diff.aRel, h.diff.bRel)}
                              disabled={busy || !h.diff || Boolean(h.error)}
                            >
                              Review Diff
                            </Button>
                            <Button size="sm" onClick={() => approveHil(h.requestRel)} disabled={busy || !h.gate.canApprove}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectHil(h.requestRel)}
                              disabled={busy || !h.gate.canReject}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>

                        {h.error ? (
                          <Alert variant="destructive">
                            <AlertTitle>Invalid HIL Request</AlertTitle>
                            <AlertDescription className="font-mono">{h.error}</AlertDescription>
                          </Alert>
                        ) : null}

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Verified</span>{" "}
                            <span className="font-mono text-foreground">{h.receipts.verified ? "yes" : "no"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Diff Viewed</span>{" "}
                            <span className="font-mono text-foreground">{h.receipts.diffViewed ? "yes" : "no"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Approved</span>{" "}
                            <span className="font-mono text-foreground">{h.receipts.hilApproved ? "yes" : "no"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rejected</span>{" "}
                            <span className="font-mono text-foreground">{h.receipts.hilRejected ? "yes" : "no"}</span>
                          </div>
                        </div>

                        {h.gate.missing.length ? (
                          <div className="text-xs text-muted-foreground">
                            Missing receipts for approval: <span className="font-mono">{h.gate.missing.join(", ")}</span>
                          </div>
                        ) : null}

                        {h.pointerRel ? (
                          <div className="text-xs text-muted-foreground">
                            Pointer: <span className="font-mono">{h.pointerRel}</span>
                          </div>
                        ) : null}
                        {h.diff ? (
                          <div className="text-xs text-muted-foreground">
                            Diff: <span className="font-mono">{h.diff.aRel}</span> vs <span className="font-mono">{h.diff.bRel}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">SOCA_OWNER_INBOX</span>
                  <span className="font-mono">{config?.ownerInbox ?? "loading"}</span>
                  <span className="text-muted-foreground">
                    Exists: <span className="font-mono text-foreground">{config?.ownerInboxExists ? "yes" : "no"}</span>
                  </span>
                </div>
                <div className="pt-2 text-muted-foreground">
                  Set the inbox path via environment variable, then restart the dev server.
                </div>
                <pre className="mt-2 rounded-md border border-border bg-muted p-3 font-mono text-xs overflow-auto">{`export SOCA_OWNER_INBOX="${config?.defaultOwnerInbox ?? ""}"\n./run_local.sh`}</pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(fileDialog)} onOpenChange={(open) => !open && setFileDialog(null)}>
        <DialogContent className="max-w-[1100px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{fileDialog?.title ?? ""}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[70vh] overflow-auto rounded-md border border-border bg-muted p-4 font-mono text-xs whitespace-pre-wrap">
            {fileDialog?.text ?? ""}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(diffDialog)} onOpenChange={(open) => !open && setDiffDialog(null)}>
        <DialogContent className="max-w-[1300px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              Diff: {diffDialog?.aRel ?? ""} vs {diffDialog?.bRel ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground">
            Receipt: <span className="font-mono text-foreground">{diffDialog?.receiptRel ?? ""}</span>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-md border border-border">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="w-16 px-2 py-2 text-right">Line</th>
                  <th className="w-1/2 px-2 py-2 text-left">A</th>
                  <th className="w-1/2 px-2 py-2 text-left">B</th>
                </tr>
              </thead>
              <tbody>
                {diffRows.map((r) => (
                  <tr key={r.i} className={r.changed ? "bg-muted/50" : ""}>
                    <td className="px-2 py-1 text-right text-muted-foreground">{r.i}</td>
                    <td className="px-2 py-1 whitespace-pre-wrap align-top">{r.a}</td>
                    <td className="px-2 py-1 whitespace-pre-wrap align-top">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
