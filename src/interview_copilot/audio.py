import tempfile
from typing import Optional, List, Deque, Tuple

import numpy as np
import sounddevice as sd
import soundfile as sf
from collections import deque


def record_to_wav_tempfile(
    seconds: int = 10,
    samplerate: int = 16000,
    channels: int = 1,
) -> str:
    """Record microphone audio and write to a temporary WAV file.

    Returns the file path to the temporary WAV file. Caller is responsible
    for deleting the file after use.
    """
    frames = int(seconds * samplerate)
    data = sd.rec(frames, samplerate=samplerate, channels=channels, dtype="float32")
    sd.wait()

    # Ensure 2D shape (frames, channels)
    if data.ndim == 1:
        data = data.reshape(-1, 1)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.close()
    sf.write(tmp.name, data, samplerate, format="WAV", subtype="PCM_16")
    return tmp.name


class StreamRecorder:
    def __init__(self, samplerate: int = 16000, channels: int = 1):
        self.samplerate = samplerate
        self.channels = channels
        self._frames: List[np.ndarray] = []
        self._stream: Optional[sd.InputStream] = None
        self._active = False

    def _callback(self, indata, frames, time, status):
        if status:
            # We ignore status messages, but could log
            pass
        # Copy to avoid referencing the same buffer
        self._frames.append(indata.copy())

    def start(self):
        if self._active:
            return
        self._frames.clear()
        self._stream = sd.InputStream(
            samplerate=self.samplerate,
            channels=self.channels,
            dtype="float32",
            callback=self._callback,
        )
        self._stream.start()
        self._active = True

    def stop_and_save(self) -> Optional[str]:
        if not self._active:
            return None
        try:
            self._stream.stop()
            self._stream.close()
        finally:
            self._active = False

        if not self._frames:
            return None
        data = np.concatenate(self._frames, axis=0)
        # Ensure 2D
        if data.ndim == 1:
            data = data.reshape(-1, 1)
        # Too short? ignore if < 0.2s
        min_frames = int(0.2 * self.samplerate)
        if data.shape[0] < min_frames:
            return None

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        sf.write(tmp.name, data, self.samplerate, format="WAV", subtype="PCM_16")
        return tmp.name


class RollingMic:
    """Continuously record into a ring buffer and allow exporting the last N seconds."""

    def __init__(self, samplerate: int = 16000, channels: int = 1, device: Optional[int] = None, buffer_seconds: int = 12):
        self.samplerate = samplerate
        self.channels = channels
        self.device = device
        self.buffer_seconds = buffer_seconds
        self._frames: Deque[np.ndarray] = deque()
        self._total_frames = 0
        self._max_frames = int(self.samplerate * self.buffer_seconds)
        self._stream: Optional[sd.InputStream] = None
        self._active = False

    def _callback(self, indata, frames, time, status):
        if status:
            # We ignore status, could log
            pass
        chunk = indata.copy()
        self._frames.append(chunk)
        self._total_frames += len(chunk)
        # Trim old frames
        while self._total_frames > self._max_frames and self._frames:
            dropped = self._frames.popleft()
            self._total_frames -= len(dropped)

    def start(self):
        if self._active:
            return
        self._frames.clear()
        self._total_frames = 0
        self._stream = sd.InputStream(
            samplerate=self.samplerate,
            channels=self.channels,
            dtype="float32",
            callback=self._callback,
            device=self.device,
        )
        self._stream.start()
        self._active = True

    def stop(self):
        if not self._active:
            return
        try:
            self._stream.stop(); self._stream.close()
        finally:
            self._active = False

    def last_audio(self, seconds: int) -> Optional[np.ndarray]:
        if not self._frames:
            return None
        need = int(seconds * self.samplerate)
        chunks = []
        total = 0
        for arr in reversed(self._frames):
            chunks.append(arr)
            total += len(arr)
            if total >= need:
                break
        if not chunks:
            return None
        data = np.concatenate(list(reversed(chunks)), axis=0)
        if data.ndim == 1:
            data = data.reshape(-1, 1)
        if len(data) > need:
            data = data[-need:]
        return data

    def last_wav_tempfile(self, seconds: int) -> Optional[str]:
        data = self.last_audio(seconds)
        if data is None or len(data) < int(0.2 * self.samplerate):
            return None
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        sf.write(tmp.name, data, self.samplerate, format="WAV", subtype="PCM_16")
        return tmp.name
