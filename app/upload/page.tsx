"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface UploadResult {
  success: boolean;
  filename: string;
  pages: number;
  characters: number;
  chunksCreated: number;
  message: string;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: string }
  | { status: "done"; result: UploadResult }
  | { status: "error"; message: string };

// ── Upload Page ──────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setState({ status: "error", message: "Only PDF files are supported." });
      return;
    }
    setSelectedFile(file);
    // Clear any previous result/error when a new file is picked
    if (state.status !== "uploading") {
      setState({ status: "idle" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setState({ status: "uploading", progress: "Uploading and parsing PDF…" });

    try {
      // Build FormData — the browser automatically sets Content-Type to
      // multipart/form-data with the correct boundary string.
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Update progress message mid-flight
      setState({ status: "uploading", progress: "Extracting text from PDF…" });

      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
        // Do NOT manually set Content-Type here — the browser must set it
        // so it can include the boundary parameter.
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Upload failed.");
      }

      setState({ status: "done", result: json as UploadResult });
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong.";
      setState({ status: "error", message: errorMessage });
    }
  };

  const reset = () => {
    setState({ status: "idle" });
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isUploading = state.status === "uploading";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200/60 px-6 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Upload PDF</h1>
              <p className="text-xs text-gray-500">Add documents to your knowledge base</p>
            </div>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={[
            "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer",
            dragOver
              ? "border-blue-400 bg-blue-50 scale-[1.01]"
              : selectedFile
              ? "border-blue-300 bg-blue-50/50"
              : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30",
            isUploading ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleInputChange}
            disabled={isUploading}
          />

          {selectedFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB · PDF
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-gray-100 text-gray-400">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">
                  Drop a PDF here, or{" "}
                  <span className="text-blue-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">Only PDF files are supported</p>
              </div>
            </div>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={[
            "w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200",
            selectedFile && !isUploading
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {state.status === "uploading" ? state.progress : "Processing…"}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload to Knowledge Base
            </>
          )}
        </button>

        {/* Result / Error cards */}
        {state.status === "done" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Upload complete!
            </div>
            <p className="text-sm text-emerald-700">{state.result.message}</p>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: "Pages", value: state.result.pages },
                { label: "Characters", value: state.result.characters.toLocaleString() },
                { label: "Chunks saved", value: state.result.chunksCreated },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl px-4 py-3 border border-emerald-100 text-center">
                  <p className="text-lg font-bold text-emerald-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={reset}
                className="flex-1 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Upload another
              </button>
              <Link
                href="/chat"
                className="flex-1 py-2 text-sm font-medium text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Ask about it →
              </Link>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 text-sm">Upload failed</p>
                <p className="text-sm text-red-600 mt-0.5">{state.message}</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="mt-3 text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {/* How it works note */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 space-y-1.5">
          <p className="font-medium text-gray-700 text-xs uppercase tracking-wider">How it works</p>
          <ol className="space-y-1 text-xs list-decimal list-inside">
            <li>Your PDF is sent as <code className="bg-gray-100 px-1 rounded text-gray-600">multipart/form-data</code> to the server</li>
            <li>Text is extracted using <code className="bg-gray-100 px-1 rounded text-gray-600">pdf-parse</code></li>
            <li>Text is split into overlapping 500-char chunks</li>
            <li>Each chunk is embedded with Hugging Face MiniLM-L6-v2</li>
            <li>Embeddings are stored in Supabase with pgvector</li>
            <li>Your chat assistant can now find and cite this document</li>
          </ol>
        </div>

      </main>
    </div>
  );
}
