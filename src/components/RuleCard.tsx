'use client';
import { useState } from "react";
import Image from "next/image";
import ResizableTable from "@/components/ResizableTable";
import RuleSettings from "@/components/RuleSettings";
import { useMemo } from "react";
import { buildPredicate } from "@/lib/ruleEngine";

// Reverse map so we show dot.notation in the UI
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
    ts: "timestamp",              // prefer timestamp for ts
};


export default function RuleCard({
    initialRule,
    allRows
}: {
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
    allRows: any[]; // 👈 all traffic rows (server passes them)
}) {


    const [title, setTitle] = useState(initialRule.title);
    const [ruleText, setRuleText] = useState(initialRule.rule);
    const [description, setDescription] = useState(initialRule.description ?? "");
    const [columns, setColumns] = useState<string[]>(initialRule.columns);
    // Recompute rows every time the rule changes
    const rows = useMemo(() => {
        const pred = buildPredicate(ruleText);
        return (allRows ?? []).filter((r) => pred(r));
    }, [allRows, ruleText]);

    // Compute intersection of keys present in ALL filtered rows
    const availableColumns = useMemo(() => {
        if (!rows || rows.length === 0) return [];

        // 1) intersection of keys
        const common = new Set(Object.keys(rows[0] || {}));
        for (const r of rows.slice(1)) {
            for (const k of Array.from(common)) {
                if (!(k in r) || r[k] === undefined || r[k] === null) {
                    common.delete(k);
                }
            }
        }

        // 2) map snake_case -> dot.notation if known (pretty labels)
        const opts = Array.from(common).map((k) => REVERSE_SNAKE[k] ?? k.replace(/_/g, "."));

        // 3) de-dup + sort
        return Array.from(new Set(opts)).sort();
    }, [rows]);

    const [open, setOpen] = useState(false);


    return (
        <div className="bg-[#135B0A] text-white rounded-lg p-4 shadow-md border border-emerald-950">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{title || "(Regla sin título)"}</h2>

                <button
                    onClick={() => setOpen(true)}
                    className="rounded-md p-1 hover:bg-white/10 active:bg-white/20"
                    aria-label="Open settings"
                    title="Open settings"
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

            {/* Slide-in settings drawer */}
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
                availableColumns={availableColumns}          // ✅ base options (compatibles)
                onSaved={(u) => {
                    setTitle(u.title);
                    setRuleText(u.rule);
                    setDescription(u.description ?? "");
                    setColumns(u.columns);
                }}
            />




        </div>
    );
}
