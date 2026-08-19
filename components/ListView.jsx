"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import Toolbar from "./Toolbar";
import ModalForm from "./ModalForm";
import FilterPanel from "./FilterPanel";
import { useScope } from "./ScopeContext";
import { fmt, toCsv, toXlsHtml, download, printTable } from "@/lib/format";

/* ==========================================================================
   Generic list card.

   The page passes its own cfg - columns, endpoint, base path. There is no
   registry lookup here any more; `cfg.endpoint` points at that resource's
   own REST route (/api/business, /api/ledger, ...).

   ========================================================================== */

/* Action ▾ button with its dropdown. The GRC list needs Edit / Barcode Print /
   GRC Print here; other lists fall back to a single Edit entry. */
function ActionMenu({ items, open, onToggle, onGo }) {
  return (
    <span
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="h-[26px] cursor-pointer rounded border-0 bg-brand px-2.5 text-xs text-white"
        onClick={onToggle}
      >
        Action &#9662;
      </button>

      {open && (
        <span className="absolute left-0 top-[28px] z-30 block min-w-[190px] rounded-md border border-line bg-white py-1 shadow-pop">
          {items.map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => onGo(m.href)}
              className={
                "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13.5px] text-ink hover:bg-[#f5f8fd] " +
                (i > 0 ? "border-t border-line" : "")
              }
            >
              <Icon name={m.icon} size={14} />
              {m.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export default function ListView({ cfg, slug }) {
  const router = useRouter();
  const { business, location, finYear } = useScope();
  const [state, setState] = useState({
    rows: [],
    labels: {},
    page: 1,
    pages: 1,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [filters, setFilters] = useState({});
  const [menuFor, setMenuFor] = useState(null);

  /* close the open Action menu on any outside click */
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuFor]);

  const columns = cfg.columns || [];
  const actionPos = cfg.actionPosition || "right";
  const actionVariant = cfg.actionVariant || "icons";

  const slugPath = cfg.slugPath || slug;
  const base = (cfg.basePath || "/admin/setting/") + slugPath;

  const searched = !cfg.searchOnly || Object.keys(filters).length > 0;

  const load = useCallback(async () => {
    if (cfg.searchOnly && Object.keys(filters).length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const qs = new URLSearchParams({
      page: String(page),
      search,
      business: business || "",
      location: location || "",
      finYear: finYear || "",
    });
    Object.entries(filters).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });

    const url = cfg.endpoint + "?" + qs;

    try {
      const r = await fetch(url);
      const d = await r.json();
      setState({
        rows: d.rows || [],
        labels: d.labels || {},
        page: d.page || 1,
        pages: d.pages || 1,
        total: d.total || 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    cfg.endpoint,
    slugPath,
    page,
    search,
    business,
    location,
    finYear,
    filters,
    cfg.searchOnly,
  ]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [slugPath, search, business, location, finYear]);

  const visible = columns.filter((c) => !hidden.includes(c.t));

  const cellValue = (row, col) => {
    const raw = row[col.k];
    if (col.f === "pill") {
      const v = String(raw || "");
      if (!v) return "";
      return (
        <span
          className={
            "pill " + (v === "Fully Adjusted" ? "pill-green" : "pill-grey")
          }
        >
          {v}
        </span>
      );
    }
    if (col.f === "dash") return raw ? String(raw) : "\u2014";
    return fmt(col.f, raw, state.labels);
  };

  const exportRows = () =>
    state.rows.map((r) =>
      visible.map((c) => {
        if (c.f === "pill") return String(r[c.k] || "");
        if (c.f === "dash") return r[c.k] ? String(r[c.k]) : "";
        return fmt(c.f, r[c.k], state.labels);
      }),
    );
  const exportHeaders = () => visible.map((c) => c.t);
  const fileBase = String(slugPath).replace(/\//g, "-");

  async function remove(id) {
    if (!window.confirm("Delete this record?")) return;
    await fetch(cfg.endpoint + "/" + id, { method: "DELETE" });
    load();
  }

  return (
    <>
      {cfg.aboveCardButton && (
        <button type="button" className="btn btn-primary mb-3">
          <Icon name="grid" size={14} /> {cfg.aboveCardButton}
        </button>
      )}

      {cfg.filters && (
        <FilterPanel
          filters={cfg.filters}
          onSearch={(f) => {
            setPage(1);
            setFilters(f);
          }}
        />
      )}

      {modal && (
        <ModalForm
          cfg={cfg}
          slug={slugPath}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            load();
          }}
        />
      )}

      <div className="card">
        <div className="card-head">
          <span className="card-title">{cfg.title}</span>
          <span className="flex-1" />
          {cfg.extraAction && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push(cfg.extraAction.href)}
            >
              <Icon name={cfg.extraAction.icon || "grid"} size={14} />{" "}
              {cfg.extraAction.label}
            </button>
          )}
          {cfg.showRefresh !== false && (
            <button type="button" className="btn btn-ghost" onClick={load}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
          )}
        </div>

        <div className="card-body">
          <Toolbar
            columns={columns}
            hidden={hidden}
            onToggleColumn={(t) =>
              setHidden((h) =>
                h.includes(t) ? h.filter((x) => x !== t) : [...h, t],
              )
            }
            search={search}
            onSearch={setSearch}
            onAdd={() => {
              if (cfg.formMode === "modal") return setModal(true);
              if (cfg.addHref) return router.push(cfg.addHref);
              return router.push(base + "/add");
            }}
            showAdd={cfg.showAdd !== false}
            showCsv={cfg.showCsv !== false}
            onExportCsv={() =>
              download(
                fileBase + ".csv",
                toCsv(exportHeaders(), exportRows()),
                "text/csv",
              )
            }
            onExportExcel={() =>
              download(
                fileBase + ".xls",
                toXlsHtml(cfg.title, exportHeaders(), exportRows()),
                "application/vnd.ms-excel",
              )
            }
            onExportPdf={() =>
              printTable(cfg.title, exportHeaders(), exportRows())
            }
          />

          <div className="mt-3 overflow-x-auto">
            <table className="dt">
              <thead>
                <tr>
                  {actionPos === "left" && <th>Action</th>}
                  {visible.map((c, i) => (
                    <th key={c.t + i}>{c.t}</th>
                  ))}
                  {actionPos === "right" && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={visible.length + 1} className="dt-empty">
                      <span className="spin" />
                    </td>
                  </tr>
                )}
                {!loading && !searched && (
                  <tr>
                    <td colSpan={visible.length + 1} className="dt-empty">
                      Use the filter above to search.
                    </td>
                  </tr>
                )}
                {!loading && searched && state.rows.length === 0 && (
                  <tr>
                    <td colSpan={visible.length + 1} className="dt-empty">
                      No Data..
                    </td>
                  </tr>
                )}
                {!loading &&
                  state.rows.map((row) => {
                    const actions = (
                      <td>
                        {actionVariant === "dropdown" ? (
                          <ActionMenu
                            items={(
                              cfg.actionMenu || [
                                {
                                  label: "Edit",
                                  icon: "pencil",
                                  to: (r) => base + "/" + r._id,
                                },
                              ]
                            ).map((m) => ({ ...m, href: m.to(row) }))}
                            open={menuFor === row._id}
                            onToggle={() =>
                              setMenuFor((m) =>
                                m === row._id ? null : row._id,
                              )
                            }
                            onGo={(href) => {
                              setMenuFor(null);
                              router.push(href);
                            }}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {(
                              cfg.actionIcons || ["view", "edit", "delete"]
                            ).map((a) => {
                              if (a === "view")
                                return (
                                  <button
                                    key={a}
                                    className="act-btn bg-[#2b7fd4]"
                                    title="View"
                                    onClick={() =>
                                      router.push(base + "/" + row._id)
                                    }
                                  >
                                    <Icon name="eye" size={12} />
                                  </button>
                                );
                              if (a === "edit")
                                return (
                                  <button
                                    key={a}
                                    className="act-btn bg-warnyellow"
                                    title="Edit"
                                    onClick={() =>
                                      router.push(base + "/" + row._id)
                                    }
                                  >
                                    <Icon name="pencil" size={12} />
                                  </button>
                                );
                              if (a === "print")
                                return (
                                  <button
                                    key={a}
                                    className="act-btn bg-[#2b7fd4]"
                                    title="Print"
                                    onClick={() => window.print()}
                                  >
                                    <Icon name="file" size={12} />
                                  </button>
                                );
                              return (
                                <button
                                  key={a}
                                  className="act-btn bg-danger"
                                  title="Delete"
                                  onClick={() => remove(row._id)}
                                >
                                  <Icon name="trash" size={12} />
                                </button>
                              );
                            })}
                            {cfg.actionExtraButton && (
                              <button
                                className="btn h-6 px-2 text-[11px]"
                                onClick={() => window.print()}
                              >
                                <Icon name="file" size={11} />{" "}
                                {cfg.actionExtraButton}
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    );
                    return (
                      <tr key={row._id}>
                        {actionPos === "left" && actions}
                        {visible.map((c, i) => (
                          <td key={c.t + i}>{cellValue(row, c)}</td>
                        ))}
                        {actionPos === "right" && actions}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center pt-3 text-[13px] text-cell">
            <span>
              Page <b className="text-brand-link">{state.page}</b> of{" "}
              {state.pages}
            </span>
            <span className="flex-1" />
            <span className="flex gap-2">
              <button
                className="btn"
                disabled={state.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn"
                disabled={state.page >= state.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
