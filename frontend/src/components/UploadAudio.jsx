import React, { useState, useRef, useEffect } from "react";

export default function UploadAudio({ onRecordingComplete, label = "Voice Recording" }) {
  const [status, setStatus] = useState("idle"); // idle | recording | stopped
  const [seconds, setSeconds] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [bars, setBars] = useState(Array(24).fill(4));

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animRef = useRef(null);

  // Animate bars while recording
  useEffect(() => {
    if (status === "recording") {
      animRef.current = setInterval(() => {
        setBars(Array(24).fill(0).map(() => Math.random() * 28 + 4));
      }, 100);
    } else {
      clearInterval(animRef.current);
      setBars(Array(24).fill(4));
    }
    return () => clearInterval(animRef.current);
  }, [status]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        onRecordingComplete && onRecordingComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
      setSeconds(0);
      setAudioURL(null);

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setStatus("stopped");
    }
  };

  const reset = () => {
    setStatus("idle");
    setAudioURL(null);
    setSeconds(0);
    onRecordingComplete && onRecordingComplete(null);
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="recorder-wrap">
      <p className="input-label">{label}</p>

      {/* Visualizer */}
      <div className={`recorder-visualizer ${status === "recording" ? "recording" : ""}`}>
        {/* Icon */}
        <div className={`recorder-icon ${status}`}>
          {status === "recording" ? "🎙️" : status === "stopped" ? "✅" : "🎤"}
        </div>

        {/* Waveform */}
        <div className="waveform">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`wave-bar ${status === "recording" ? "active" : ""}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Status text */}
        <p className={`recorder-status ${status}`}>
          {status === "recording" ? (
            <>
              <span className="recording-dot" /> Recording... {formatTime(seconds)}
            </>
          ) : status === "stopped" ? (
            "✓ Recording complete"
          ) : (
            "Press Start to begin"
          )}
        </p>
      </div>

      {/* Controls */}
      <div className="recorder-controls">
        <button
          type="button"
          className="btn btn-success"
          onClick={startRecording}
          disabled={status === "recording"}
        >
          🎙️ Start
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={stopRecording}
          disabled={status !== "recording"}
        >
          ⏹ Stop
        </button>
        {status === "stopped" && (
          <button type="button" className="btn btn-ghost" onClick={reset}>
            ↺ Redo
          </button>
        )}
      </div>

      {/* Playback */}
      {audioURL && (
        <div className="playback-wrap">
          <p className="input-label" style={{ marginBottom: "6px" }}>Preview</p>
          <audio controls src={audioURL} />
        </div>
      )}
    </div>
  );
}
