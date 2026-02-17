import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

const FileDropzone = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf,.csv,.txt";
    input.onchange = (e) => {
      const selected = Array.from((e.target as HTMLInputElement).files || []);
      setFiles((prev) => [...prev, ...selected]);
    };
    input.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`mx-auto w-full max-w-2xl cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
        isDragging
          ? "border-primary bg-accent"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Drop your statements here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse · PDF, CSV, TXT supported · Multiple files allowed
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted px-4 py-2 text-sm"
            >
              <span className="text-foreground">{file.name}</span>
              <span className="text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
