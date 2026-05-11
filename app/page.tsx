"use client";

import {
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
import { useEffect, useMemo, useState } from "react";

type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

const notesKey = "personal-notepad:notes";
const themeKey = "personal-notepad:theme";
const fontSizeKey = "personal-notepad:font-size";
const minFontSize = 14;
const maxFontSize = 24;
const defaultFontSize = 14;

const starterNotes: Note[] = [
  {
    id: "welcome",
    title: "Welcome",
    body:
      "This notepad saves notes in your browser. Create a note, search your list, and switch between light and dark mode from the toolbar.",
    updatedAt: 1735689600000
  }
];

function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: "Untitled note",
    body: "",
    updatedAt: Date.now()
  };
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>(starterNotes);
  const [activeId, setActiveId] = useState(starterNotes[0].id);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedNotes = window.localStorage.getItem(notesKey);
    const savedTheme = window.localStorage.getItem(themeKey) as
      | "light"
      | "dark"
      | null;
    const savedFontSize = Number(window.localStorage.getItem(fontSizeKey));
    let parsedNotes: Note[] | null = null;

    try {
      parsedNotes = savedNotes ? (JSON.parse(savedNotes) as Note[]) : null;
    } catch {
      parsedNotes = null;
    }

    if (parsedNotes?.length) {
      setNotes(parsedNotes);
      setActiveId(parsedNotes[0].id);
    }

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
    document.documentElement.dataset.theme = theme;
    if (hydrated) {
      window.localStorage.setItem(themeKey, theme);
    }
  }, [hydrated, theme]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(notesKey, JSON.stringify(notes));
    }
  }, [hydrated, notes]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(fontSizeKey, String(fontSize));
    }
  }, [fontSize, hydrated]);

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

  function addNote() {
    const note = createNote();
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
    setSidebarOpen(true);
  }

  function updateActiveNote(values: Partial<Pick<Note, "title" | "body">>) {
    if (!activeNote) {
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === activeNote.id
          ? { ...note, ...values, updatedAt: Date.now() }
          : note
      )
    );
  }

  function deleteActiveNote() {
    if (!activeNote) {
      return;
    }

    setNotes((current) => {
      const remaining = current.filter((note) => note.id !== activeNote.id);
      const nextNotes = remaining.length ? remaining : [createNote()];
      setActiveId(nextNotes[0].id);
      return nextNotes;
    });
  }

  function changeFontSize(direction: "smaller" | "larger") {
    setFontSize((current) => {
      const next = direction === "smaller" ? current - 1 : current + 1;
      return Math.min(maxFontSize, Math.max(minFontSize, next));
    });
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
            <FileText size={18} />
            <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
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

        {activeNote ? (
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
            <p>No note selected</p>
          </div>
        )}
      </section>
    </main>
  );
}
