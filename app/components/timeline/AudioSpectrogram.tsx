import React, { useState, useRef, useCallback, useEffect } from "react";
import { DEFAULT_TRACK_HEIGHT, type ScrubberState } from "./types";

interface AudioSpectrogramProps {
  scrubber: ScrubberState;
  timelineWidth: number;
  onUpdate: (updatedScrubber: ScrubberState) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerSecond: number;
  isSelected?: boolean;
  onSelect?: (scrubberId: string) => void;
  trackCount: number;
}

export const AudioSpectrogram: React.FC<AudioSpectrogramProps> = ({
  scrubber,
  timelineWidth,
  onUpdate,
  containerRef,
  pixelsPerSecond,
  isSelected = false,
  onSelect,
  trackCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({
    offsetX: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (onSelect) {
        onSelect(scrubber.id);
      }

      setIsDragging(true);
      dragStateRef.current.offsetX = e.clientX - scrubber.left;
    },
    [scrubber, onSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      let rawNewLeft = e.clientX - dragStateRef.current.offsetX;
      const min = 0;
      const max = timelineWidth - scrubber.width;
      rawNewLeft = Math.max(min, Math.min(max, rawNewLeft));

      let newTrack = scrubber.y || 0;
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop || 0;
        const mouseY = e.clientY - containerRect.top + scrollTop;
        const trackIndex = Math.floor(mouseY / DEFAULT_TRACK_HEIGHT);
        newTrack = Math.max(0, Math.min(trackCount - 1, trackIndex));
      }

      const updatedScrubber = { ...scrubber, left: rawNewLeft, y: newTrack };
      onUpdate(updatedScrubber);
    },
    [isDragging, scrubber, timelineWidth, onUpdate, containerRef, trackCount]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scrubber.spectrogramData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = scrubber.spectrogramData;

    ctx.clearRect(0, 0, width, height);

    const columnWidth = width / data.length;

    for (let i = 0; i < data.length; i++) {
      const column = data[i];
      const columnHeight = height / column.length;
      for (let j = 0; j < column.length; j++) {
        const value = column[j];
        const hue = (value / 255) * 240; // Blue to red
        ctx.fillStyle = `hsl(${240 - hue}, 100%, 50%)`;
        ctx.fillRect(i * columnWidth, height - (j * columnHeight), columnWidth, columnHeight);
      }
    }
  }, [scrubber.spectrogramData, scrubber.width]);

  return (
    <div
      className={`group absolute rounded-sm cursor-grab active:cursor-grabbing border shadow-sm hover:shadow-md transition-all bg-blue-600 border-blue-500 text-white select-none ${isSelected ? "ring-2 ring-blue-400/50" : ""}`}
      style={{
        left: `${scrubber.left}px`,
        width: `${scrubber.width}px`,
        top: `${(scrubber.y || 0) * DEFAULT_TRACK_HEIGHT + 2}px`,
        height: `${DEFAULT_TRACK_HEIGHT - 4}px`,
        zIndex: isDragging ? 1000 : isSelected ? 20 : 15,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-0.5 left-2 text-xs font-medium opacity-80 pointer-events-none">
        A
      </div>
      <div className="absolute top-0.5 left-8 right-2 text-xs truncate opacity-90 pointer-events-none">
        {scrubber.name}
      </div>
      <canvas
        ref={canvasRef}
        width={scrubber.width}
        height={DEFAULT_TRACK_HEIGHT - 4}
        className="w-full h-full"
      />
    </div>
  );
};
