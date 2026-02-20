import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAndParse, generateSessionId } from "@/lib/transactions";
import { toast } from "@/hooks/use-toast";

const FileDropzone = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);

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

  const handleParse = async () => {
    if (files.length === 0) return;
    setParsing(true);
    const sessionId = generateSessionId();

    try {
      for (const file of files) {
        await uploadAndParse(file, sessionId);
      }
      navigate(`/results?session=${sessionId}`);
    } catch (error: any) {
      toast({
        title: "Parsing failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200 ${
          isDragging
            ? "border-primary bg-accent"
            : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" />
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
      </div>

      {files.length > 0 && (
        <>
          <div className="space-y-2">
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
          <Button
            onClick={handleParse}
            disabled={parsing}
            className="w-full"
            size="lg"
          >
            {parsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              `Parse ${files.length} file${files.length > 1 ? "s" : ""}`
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default FileDropzone;
