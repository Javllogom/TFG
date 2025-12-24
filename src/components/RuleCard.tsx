"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import ResizableTable from "@/components/ResizableTable";
import RuleSettings from "@/components/RuleSettings";
import AccessDeniedModal from "@/components/AccessDeniedModal";
import { buildPredicate } from "@/lib/ruleEngine";

const REVERSE_SNAKE: Record<string, string> = {
  user_name: "user.name",
  host_name: "host.name",
  process_name: "process.name",
  process_executable: "process.executable",
  process_command_line: "process.command_line",
  process_parent_name: "process.parent.name",
  process_pid: "process.pid",
  process_args: "process.args",
  agent_name: "agent.name",
  event_type: "event.type",
  event_id: "event.id",
  host_ip: "host.ip",
  source_ip: "source.ip",
  destination_ip: "destination.ip",
  user_id: "user.id",
  ts: "timestamp",
};

type RuleCardProps = {
  initialRule: {
    id?: string;
    binary: string;
    title: string;
    rule: string;
    description?: string;
    columns: string[];
    matchBinary: string;
    matchTitle: string;
  };
  allRows: any[];
  showEmpty?: boolean;
};

type MeUser = { role: "admin" | "user" };

export default function RuleCard({
  initialRule,
  allRows,
  showEmpty = true,
}: RuleCardProps) {
  const [title, setTitle] = useState(initialRule.title);
  const [ruleText, setRuleText] = useState(initialRule.rule);
  const [description, setDescription] = useState(initialRule.description ?? "");
  const [columns, setColumns] = useState<string[]>(initialRule.columns);
  const [open, setOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);

  useEffect(() => {
    async function loadMe() {
      setMeLoaded(false);
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        const role = (data?.user as MeUser | null)?.role;
        setIsAdmin(role === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setMeLoaded(true);
      }
    }

    loadMe();
    const onAuth = () => loadMe();
    window.addEventListener("auth-changed", onAuth);
    return () => window.removeEventListener("auth-changed", onAuth);
  }, []);

  useEffect(() => {
    console.log("=== RuleCard mount ===", initialRule.title);
    console.log("Total allRows:", allRows?.length);
  }, [allRows, initialRule.title]);

  const rows = useMemo<any[]>(() => {
    const pred = buildPredicate(ruleText);
    return (allRows ?? []).filter((r) => pred(r));
  }, [allRows, ruleText]);

  const availableColumns = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    const common = new Set(Object.keys(rows[0] || {}));
    for (const r of rows.slice(1)) {
      for (const k of Array.from(common)) {
        if (!(k in r) || r[k] == null) common.delete(k);
      }
    }

    const opts = Array.from(common).map((k) => REVERSE_SNAKE[k] ?? k.replace(/_/g, "."));
    return Array.from(new Set(opts)).sort();
  }, [rows]);

  if (!showEmpty && rows.length === 0) {
    return null;
  }

  function onGearClick() {
    if (!meLoaded) return; // avoids flicker right after load
    if (!isAdmin) {
      setDenyOpen(true);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <div className="bg-[#135B0A] text-white rounded-lg p-4 shadow-md border border-emerald-950">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{title || "(Regla sin título)"}</h2>

          <button
            onClick={onGearClick}
            className="rounded-md p-1 hover:bg-white/10 active:bg-white/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Open settings"
            title="Open settings"
            disabled={!meLoaded}
          >
            <Image
              src="/images/white_gear.png"
              alt="Rule settings"
              width={22}
              height={22}
              className="opacity-90"
            />
          </button>
        </div>

        <div className="h-[3px] bg-white/70 rounded-md my-2" />

        <ResizableTable columns={columns} rows={rows} minColWidth={120} />

        <RuleSettings
          open={open}
          onClose={() => setOpen(false)}
          initial={{
            id: initialRule.id,
            binary: initialRule.binary,
            title,
            rule: ruleText,
            description,
            columns,
            matchBinary: initialRule.matchBinary,
            matchTitle: initialRule.matchTitle,
          }}
          availableColumns={availableColumns}
          onSaved={(u) => {
            setTitle(u.title);
            setRuleText(u.rule);
            setDescription(u.description ?? "");
            setColumns(u.columns);
          }}
        />
      </div>

      {denyOpen ? (
        <AccessDeniedModal
          mode="soft"
          message="Acceso denegado: solo administradores pueden abrir la configuración de reglas."
          onClose={() => setDenyOpen(false)}
        />
      ) : null}

    </>
  );
}
