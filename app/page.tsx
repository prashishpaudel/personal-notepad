"use client";

import {
  Cloud,
  CloudOff,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  FileText,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus as PlusIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, NoteRow, supabase } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

const themeKey = "personal-notepad:theme";
const fontSizeKey = "personal-notepad:font-size";
const minFontSize = 14;
const maxFontSize = 24;
const defaultFontSize = 14;

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function noteFromRow(row: NoteRow): Note {
  return {
    body: row.body,
    id: row.id,
    title: row.title,
    updatedAt: new Date(row.updated_at).getTime()
  };
}

export default function Home() {
  const pendingSaveRef = useRef<Partial<Pick<Note, "title" | "body">>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "loading"
  );
  const [syncMessage, setSyncMessage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(themeKey) as
      | "light"
      | "dark"
      | null;
    const savedFontSize = Number(window.localStorage.getItem(fontSizeKey));

    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    if (savedFontSize >= minFontSize && savedFontSize <= maxFontSize) {
      setFontSize(savedFontSize);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    async function loadNotes() {
      if (!hydrated) {
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setSyncStatus("error");
        setSyncMessage("Add Supabase env vars to sync shared notes.");
        return;
      }

      setSyncStatus("loading");
      setSyncMessage("");

      const { data, error } = await supabase
        .from("notes")
        .select("id,title,body,updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }

      const loadedNotes = (data ?? []).map(noteFromRow);
      setNotes(loadedNotes);
      setActiveId((current) => current || loadedNotes[0]?.id || "");
      setSyncStatus("idle");
    }

    loadNotes();
  }, [hydrated]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (hydrated) {
      window.localStorage.setItem(themeKey, theme);
    }
  }, [hydrated, theme]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(fontSizeKey, String(fontSize));
    }
  }, [fontSize, hydrated]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return notes;
    }

    return notes.filter((note) =>
      `${note.title} ${note.body}`.toLowerCase().includes(normalizedQuery)
    );
  }, [notes, query]);

  const activeNote = notes.find((note) => note.id === activeId) ?? notes[0];

  async function addNote() {
    if (!supabase) {
      setSyncStatus("error");
      setSyncMessage("Supabase is not configured.");
      return;
    }

    setSyncStatus("saving");

    const { data, error } = await supabase
      .from("notes")
      .insert({ body: "", title: "Untitled note" })
      .select("id,title,body,updated_at")
      .single();

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return;
    }

    const note = noteFromRow(data);
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
    setSidebarOpen(true);
    setSyncStatus("idle");
    setSyncMessage("");
  }

  function updateActiveNote(values: Partial<Pick<Note, "title" | "body">>) {
    if (!activeNote) {
      return;
    }

    const noteId = activeNote.id;

    setNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? { ...note, ...values, updatedAt: Date.now() }
          : note
      )
    );

    persistNote(noteId, values);
  }

  async function deleteActiveNote() {
    if (!activeNote) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${activeNote.title || "Untitled note"}"? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    if (!supabase) {
      setSyncStatus("error");
      setSyncMessage("Supabase is not configured.");
      return;
    }

    const noteId = activeNote.id;
    const nextNotes = notes.filter((note) => note.id !== noteId);
    setSyncStatus("saving");
    setNotes(nextNotes);
    setActiveId(nextNotes[0]?.id || "");

    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return;
    }

    setSyncStatus("idle");
    setSyncMessage("");
  }

  function persistNote(id: string, values: Partial<Pick<Note, "title" | "body">>) {
    if (!supabase) {
      return;
    }

    const client = supabase;
    pendingSaveRef.current = { ...pendingSaveRef.current, ...values };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSyncStatus("saving");
    setSyncMessage("");

    saveTimeoutRef.current = setTimeout(async () => {
      const pendingValues = pendingSaveRef.current;
      pendingSaveRef.current = {};
      const updatedAt = new Date().toISOString();
      const { data, error } = await client
        .from("notes")
        .update({ ...pendingValues, updated_at: updatedAt })
        .eq("id", id)
        .select("id,title,body,updated_at")
        .single();

      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }

      const savedNote = noteFromRow(data);
      setNotes((current) => {
        const nextNotes = current.map((note) =>
          note.id === savedNote.id ? { ...note, updatedAt: savedNote.updatedAt } : note
        );
        return [...nextNotes].sort((first, second) => second.updatedAt - first.updatedAt);
      });
      setSyncStatus("idle");
    }, 600);
  }

  function changeFontSize(direction: "smaller" | "larger") {
    setFontSize((current) => {
      const next = direction === "smaller" ? current - 1 : current + 1;
      return Math.min(maxFontSize, Math.max(minFontSize, next));
    });
  }

  if (!hydrated) {
    return <main className="app-shell app-loading" aria-label="Loading notepad" />;
  }

  return (
    <main className={`app-shell ${sidebarOpen ? "sidebar-visible" : "sidebar-hidden"}`}>
      <button
        className="sidebar-backdrop"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close notes list"
      />
      <aside className={`sidebar ${sidebarOpen ? "is-open" : "is-closed"}`}>
        <div className="sidebar-header">
          <div>
            <p className="eyebrow">Personal</p>
            <h1>Notepad</h1>
          </div>
          <button className="icon-button" onClick={addNote} aria-label="New note">
            <Plus size={19} />
          </button>
        </div>

        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
          />
        </label>

        <div className="note-list" aria-label="Notes">
          {filteredNotes.map((note) => (
            <button
              className={`note-row ${note.id === activeNote?.id ? "active" : ""}`}
              key={note.id}
              onClick={() => {
                setActiveId(note.id);
                if (window.innerWidth < 780) {
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="note-row-title">{note.title || "Untitled note"}</span>
              <span className="note-row-preview">
                {note.body || "No additional text"}
              </span>
              <span className="note-row-date">{formatDate(note.updatedAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="editor-panel">
        <header className="toolbar">
          <button
            className="icon-button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Hide notes list" : "Show notes list"}
          >
            {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>

          <div className="toolbar-status">
            {syncStatus === "error" ? <CloudOff size={18} /> : <Cloud size={18} />}
            <span>
              {syncStatus === "loading"
                ? "Loading"
                : syncStatus === "saving"
                  ? "Saving"
                  : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
            </span>
          </div>

          <div className="toolbar-actions">
            <div className="font-controls" aria-label="Editor font size">
              <button
                className="icon-button compact"
                onClick={() => changeFontSize("smaller")}
                disabled={fontSize === minFontSize}
                aria-label="Decrease font size"
              >
                <Minus size={17} />
              </button>
              <span>{fontSize}px</span>
              <button
                className="icon-button compact"
                onClick={() => changeFontSize("larger")}
                disabled={fontSize === maxFontSize}
                aria-label="Increase font size"
              >
                <PlusIcon size={17} />
              </button>
            </div>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle color mode"
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="icon-button danger"
              onClick={deleteActiveNote}
              aria-label="Delete note"
            >
              <Trash2 size={19} />
            </button>
          </div>
        </header>

        {syncStatus === "error" ? (
          <div className="empty-state">
            <CloudOff size={34} />
            <p>{syncMessage || "Unable to sync notes."}</p>
          </div>
        ) : syncStatus === "loading" ? (
          <div className="empty-state">
            <FileText size={34} />
            <p>Loading notes</p>
          </div>
        ) : activeNote ? (
          <article className="editor">
            <input
              className="title-input"
              value={activeNote.title}
              onChange={(event) => updateActiveNote({ title: event.target.value })}
              aria-label="Note title"
              placeholder="Untitled note"
            />
            <p className="updated">Updated {formatDate(activeNote.updatedAt)}</p>
            <textarea
              className="body-input"
              style={{ fontSize }}
              value={activeNote.body}
              onChange={(event) => updateActiveNote({ body: event.target.value })}
              aria-label="Note body"
              placeholder="Start typing..."
            />
          </article>
        ) : (
          <div className="empty-state">
            <FileText size={34} />
            <p>No notes yet</p>
          </div>
        )}
      </section>
    </main>
  );
}
