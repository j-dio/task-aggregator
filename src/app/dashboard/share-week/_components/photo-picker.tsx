"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 8 * 1024 * 1024;

interface PhotoPickerProps {
  photoDataUrl: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function PhotoPicker({ photoDataUrl, onChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photo is over 8 MB. Pick a smaller one.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Couldn't read that file.");
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Background photo
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="flex-1"
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {photoDataUrl ? "Change photo" : "Pick a photo"}
        </Button>
        {photoDataUrl && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setError(null);
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Clear photo"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {!error && (
        <p className="text-muted-foreground text-xs">
          Optional. Stays on your device.
        </p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
