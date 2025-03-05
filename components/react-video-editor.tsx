"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Sequence, Video, interpolate, useCurrentFrame,  Audio, staticFile } from "remotion";
import { LetterText, Plus, Text } from "lucide-react";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Clip, TextOverlay, Sound } from "@/types/types";

/**
 * TimelineMarker Component
 * Renders a marker on the timeline to indicate the current frame position
 */
const TimelineMarker: React.FC<{
  currentFrame: number;
  totalDuration: number;
}> = React.memo(({ currentFrame, totalDuration }) => {
  const markerPosition = useMemo(() => {
    return `${(currentFrame / totalDuration) * 100}%`;
  }, [currentFrame, totalDuration]);

  return (
    <div
      className="absolute top-0 w-[1.4px] bg-red-500 pointer-events-none z-50"
      style={{
        left: markerPosition,
        transform: "translateX(-50%)",
        height: "120px",
        top: "0px",
      }}
    >
      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-red-500 absolute top-[0px] left-1/2 transform -translate-x-1/2" />
    </div>
  );
});

TimelineMarker.displayName = "TimelineMarker";

/**
 * ReactVideoEditor Component
 * Main component for the video editor interface
 */
const ReactVideoEditor: React.FC = () => {
  // State management
  const [clips, setClips] = useState<Clip[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [audioOverlays, setAudioOverlays] = useState<Sound[]>([]);
  const [totalDuration, setTotalDuration] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [fps, setFps] = useState(30);

  // Refs
  const playerRef = useRef<PlayerRef>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);


  /**
   * Adds a new text overlay to the timeline
   */
 const addTextOverlay = (redditText: { text: string; duration: number }) => {
  setTextOverlays((prevTextOverlays) => {
    const lastItem = prevTextOverlays.reduce(
      (latest, item) =>
        item.start + item.duration > latest.start + latest.duration ? item : latest,
      { start: 0, duration: 0 }
    );

    console.log(redditText, lastItem);

    const newOverlay: TextOverlay = {
      id: `text-${prevTextOverlays.length + 1}`,
      start: lastItem.start + lastItem.duration,
      duration: redditText.duration,
      text: redditText.text,
      row: 1,
    };

    const updatedOverlays = [...prevTextOverlays, newOverlay];

    updateTotalDuration(clips, updatedOverlays, audioOverlays);

    return updatedOverlays;
  });
};

  /**
   * Updates the total duration of the composition based on clips and text overlays
   */
  const updateTotalDuration = (
    updatedClips: Clip[],
    updatedTextOverlays: TextOverlay[],
    updatedAudioOverlays: Sound[],
  ) => {
    const lastClipEnd = updatedClips.reduce(
      (max, clip) => Math.max(max, clip.start + clip.duration),
      0
    );
    const lastTextOverlayEnd = updatedTextOverlays.reduce(
      (max, overlay) => Math.max(max, overlay.start + overlay.duration),
      0
    );
    const lastAudioEnd = updatedAudioOverlays.reduce(
      (max, audio) => Math.max(max, audio.start + audio.duration),
      0
    );

    const newTotalDuration = Math.max(lastClipEnd, lastTextOverlayEnd, lastAudioEnd);
    setTotalDuration(newTotalDuration);
  };

  /**
   * Composition component for Remotion Player
   */
 const Composition = useCallback(() => (
  <>
    {[...clips]
      .sort((a, b) => a.start - b.start)
      .map((item) => (
        <Sequence
          key={`clip-${item.id}`}
          from={item.start}
          durationInFrames={item.duration}
        >
          <Video src={item.src} muted={true} />
        </Sequence>
      ))}

    {[...textOverlays]
      .sort((a, b) => a.start - b.start)
      .map((item) => (
        <Sequence
          key={`text-${item.id}`}
          from={item.start}
          durationInFrames={item.duration}
        >
          <TextOverlayComponent text={item.text} />
        </Sequence>
      ))}

      {[...audioOverlays].sort((a, b) => a.start - b.start).map((item) => (
        <Sequence
          key={`audio-${item.id}`}
          from={item.start}
          durationInFrames={item.duration}
        >
          <Audio src={item.file} />
        </Sequence>
      ))}
  </>

), [clips, textOverlays, audioOverlays]);

  /**
   * Adds a new clip to the timeline
   */
  const addClip = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {

      const lastItem = [...clips].reduce(
        (latest, item) =>
          item.start + item.duration > latest.start + latest.duration
            ? item
            : latest,
        { start: 0, duration: 0 }
      );


      const fileURL = URL.createObjectURL(event.target.files[0]);
      const newClip: Clip = {
        id: `clip-${clips.length + 1}`,
        start: lastItem.start + lastItem.duration,
        duration: 600,
        src: fileURL,
        row: 0,
      };
  
      setClips([...clips, newClip]);
      updateTotalDuration([...clips, newClip], textOverlays, audioOverlays);
    }
  };


  const addAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const fileURL = URL.createObjectURL(event.target.files[0]);
      const duration = await getAudioDurationInSeconds(fileURL);
      console.log(duration, 'duration')
      const newAudio: Sound = {
        id: `audio-${audioOverlays.length + 1}`,
        start: 0,
        duration: Math.round(duration * 30),
        file: fileURL,
        row: 2,
        content: "audio",
      };
      setAudioOverlays([...audioOverlays, newAudio]);
      updateTotalDuration(clips, textOverlays, [...audioOverlays, newAudio]);
    }
  };


  /**
   * TimelineItem component for rendering clips and text overlays on the timeline
   */
  const TimelineItem: React.FC<{
    item: Clip | TextOverlay | Sound;
    type: "clip" | "text" | "audio";
    index: number;
  }> = ({ item, type, index }) => {
    const bgColor =
      type === "clip"
        ? "bg-indigo-500 to-indigo-400"
        : type === "text"
        ? "bg-purple-500 to-purple-400"
        : type === "audio"
        ? "bg-green-500 to-green-400"
        : "";

    return (
      <div
        key={item.id}
        className={`absolute h-10 ${bgColor} rounded-md`}
        style={{
          left: `${(item.start / totalDuration) * 100}%`,
          width: `calc(${(item.duration / totalDuration) * 100}% - 4px)`,
          top: `${item.row * 44}px`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold">
          {type.charAt(0).toUpperCase() + type.slice(1)} {index + 1}
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-md cursor-ew-resize mt-1 mb-1 ml-1" />
        <div className="absolute right-0 top-0 bottom-0 w-1.5 rounded-md cursor-ew-resize mt-1 mb-1 mr-1" />
      </div>
    );
  };

  // Effect for updating current frame
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        if (frame !== null) {
          setCurrentFrame(frame);
        }
      }
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, []);

  // Effect for checking mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    
    if (hasInitialized.current) return; // Prevents second execution  
    hasInitialized.current = true; // Set flag  
  
    const redditText = [
      { text: "hello world", duration: 100 },
      { text: "bye world", duration: 100 }
    ];
  
    redditText.forEach(addTextOverlay); // Add text overlays
  
  }, []); // Empty dependency array ensures this only runs on mount
  

  // Render mobile view message if on a mobile device
  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Mobile View Not Supported</h2>
          <p className="text-md">This video editor is only available on desktop or laptop devices.</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="flex-col text-white">
      {/* Player section */}
      <div className="flex overflow-hidden">
        <div className="border border-gray-700 flex-grow p-6 flex items-center justify-center overflow-hidden bg-gray-800">
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="shadow-lg rounded-lg overflow-hidden bg-slate-900"
              style={{
                width: `700px`,
                height: `400px`,
              }}
            >
              <Player
                ref={playerRef}
                component={Composition}
                durationInFrames={Math.max(1, totalDuration)}
                compositionWidth={1920}
                compositionHeight={1080}
                controls
                fps={fps}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                renderLoading={() => <div>Loading...</div>}
                inputProps={{}}
                acknowledgeRemotionLicense
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline section */}
      <div className="h-60 bg-gray-900 w-full overflow-hidden flex flex-col border border-gray-700 rounded-b-md">
        {/* Timeline controls */}
        <div className="flex justify-between items-center border-b border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => document.getElementById("videoInput")?.click()}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Add Clip</span>
            </button>
            <input id="videoInput" type="file" accept="video/*" onChange={addClip} className="hidden"/> 
            <button
              onClick={() => addTextOverlay({text: "hello world", duration: 100})}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <LetterText className="h-5 w-5" />
              <span className="text-sm font-medium">Add Text</span>
            </button>
            <input id="audioInput" type="file" accept="audio/mp3" onChange={addAudio} className="hidden"/> 
            <button
              onClick={() => document.getElementById("audioInput")?.click()}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <LetterText className="h-5 w-5" />
              <span className="text-sm font-medium">Add Audio</span>
            </button>
          </div>
        </div>

        {/* Timeline items */}
        <div
          ref={timelineRef}
          className="bg-gray-800 rounded-lg shadow-inner relative"
        >
          <div className="absolute inset-0">
            <div className="top-10 left-0 right-0 bottom-0 p-2">
              <div
                className="gap-4"
                style={{
                  width: `100%`,
                  height: "100%",
                  position: "relative",
                }}
              >
                <div className="h-10 inset-0 flex flex-col z-0">
                  <div className="flex-grow flex flex-col p-[2px]">
                    <div className="flex-grow bg-gradient-to-b from-gray-700 to-gray-800 rounded-sm"></div>
                  </div>
                </div>
                {clips.map((clip, index) => (
                  <TimelineItem
                    key={clip.id}
                    item={clip}
                    type="clip"
                    index={index}
                  />
                ))}
                {textOverlays.map((overlay, index) => (
                  <TimelineItem
                    key={overlay.id}
                    item={overlay}
                    type="text"
                    index={index}
                  />
                ))}
                {audioOverlays.map((sound, index) => (
                  <TimelineItem
                    key={sound.id}
                    item={sound}
                    type="audio"
                    index={index}
                  />
                ))}
              </div>
            </div>
          </div>
          <TimelineMarker
            currentFrame={currentFrame}
            totalDuration={totalDuration}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * TextOverlayComponent
 * Renders a text overlay with a fade-in effect
 */
const TextOverlayComponent: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "64px",
        fontWeight: "bold",
        color: "white",
        textShadow: "0 0 5px black",
        opacity,
      }}
    >
      {text}
    </div>
  );
};

export default ReactVideoEditor;
