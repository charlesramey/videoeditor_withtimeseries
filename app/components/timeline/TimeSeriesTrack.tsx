import React, { useState, useRef, useCallback, useEffect } from "react";
import { DEFAULT_TRACK_HEIGHT, type ScrubberState } from "./types";

interface TimeSeriesTrackProps {
  scrubber: ScrubberState;
  timelineWidth: number;
  onUpdate: (updatedScrubber: ScrubberState) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerSecond: number;
  isSelected?: boolean;
  onSelect?: (scrubberId: string) => void;
  trackCount: number;
}

export const TimeSeriesTrack: React.FC<TimeSeriesTrackProps> = ({
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

  const generatePath = () => {
    if (!scrubber.timeSeriesData || scrubber.timeSeriesData.length === 0) {
      return "";
    }

    const data = scrubber.timeSeriesData;
    const width = scrubber.width;
    const height = DEFAULT_TRACK_HEIGHT - 4;

    const minTime = data[0].time;
    const maxTime = data[data.length - 1].time;
    const duration = maxTime - minTime;

    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const valueRange = maxValue - minValue;

    if (valueRange === 0) {
        // Handle case where all values are the same
        const y = height / 2;
        return `M 0 ${y} L ${width} ${y}`;
    }

    return data
      .map((d, i) => {
        const x = ((d.time - minTime) / duration) * width;
        const y = height - ((d.value - minValue) / valueRange) * height;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  };

  const pathData = generatePath();

  return (
    <div
      className={`group absolute rounded-sm cursor-grab active:cursor-grabbing border shadow-sm hover:shadow-md transition-all bg-teal-600 border-teal-500 text-white select-none ${isSelected ? "ring-2 ring-teal-400/50" : ""}`}
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
        TS
      </div>
      <div className="absolute top-0.5 left-8 right-2 text-xs truncate opacity-90 pointer-events-none">
        {scrubber.name}
      </div>
      <svg width="100%" height="100%" viewBox={`0 0 ${scrubber.width} ${DEFAULT_TRACK_HEIGHT - 4}`}>
        <path d={pathData} stroke="white" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
};
