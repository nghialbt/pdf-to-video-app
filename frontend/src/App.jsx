import { useState, useRef } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [duration, setDuration] = useState(5) // Default 5 seconds
  const [transition, setTransition] = useState("none")
  const [transitionDuration, setTransitionDuration] = useState(1.0)
  const [quality, setQuality] = useState("low")
  const [loading, setLoading] = useState(false)

  // ... (lines 9-58)

  const formData = new FormData()
  formData.append("file", file)
  formData.append("duration", duration)
  formData.append("transition", transition)
  formData.append("transition_duration", transitionDuration)
  formData.append("quality", quality)

  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
    const response = await fetch(`${API_URL}/generate-video`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `Server Error: ${response.status} ${response.statusText}`)
    }

    setVideoUrl(data.video_url)
  } catch (err) {
    console.error(err)
    setError(err.message || "An error occurred while processing the PDF.")
  } finally {
    setLoading(false)
  }
}

const handleDownload = async () => {
  if (!videoUrl) return;

  try {
    // Fetch the blob first
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const filename = videoUrl.split('/').pop() || 'video.mp4';

    // Check for File System Access API support
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Video File',
            accept: { 'video/mp4': ['.mp4'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (pickerErr) {
        // Provide a way to fallback if picker was cancelled or failed but not strictly due to lack of support (though AbortError usually means cancel)
        if (pickerErr.name !== 'AbortError') {
          console.warn("File picker failed, falling back to default download.", pickerErr);
          fallbackDownload(blob, filename);
        }
      }
    } else {
      // Fallback
      fallbackDownload(blob, filename);
    }
  } catch (err) {
    console.error('Download failed', err);
    setError("Failed to download file.");
  }
};

const fallbackDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

return (
  <div className="container">
    <header>
      <h1>PDF to Video</h1>
      <p className="subtitle">Transform your PDF slides into an engaging video.</p>
    </header>

    <div
      className={`upload-area ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <div className="upload-icon">📄</div>
      {file ? (
        <div>
          <div className="file-info">{file.name}</div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '5px' }}>
            Ready to process
          </div>
        </div>
      ) : (
        <div>
          <div>Drag & Drop your PDF here</div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '5px' }}>
            or click to browse
          </div>
        </div>
      )}
    </div>

    <div className="controls">
      <label htmlFor="duration">Slide Duration (seconds)</label>
      <div className="input-group">
        <input
          id="duration"
          type="number"
          min="1"
          max="60"
          value={duration}
          onChange={(e) => setDuration(parseFloat(e.target.value))}
        />
        <span style={{ color: '#94a3b8' }}>per image</span>
      </div>
    </div>

    <div className="controls">
      <label htmlFor="transition">Transition Effect</label>
      <div className="input-group">
        <select
          id="transition"
          value={transition}
          onChange={(e) => setTransition(e.target.value)}
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--border-color)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '1rem',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <option value="none">None (Cut)</option>
          <option value="crossfade">Crossfade (Overlap)</option>
          <option value="fadeinout">Dip to Black</option>
        </select>
      </div>
    </div>

    {transition !== "none" && (
      <div className="controls">
        <label htmlFor="transitionDuration">Transition Duration (seconds)</label>
        <div className="input-group">
          <input
            id="transitionDuration"
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={transitionDuration}
            onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
          />
          <span style={{ color: '#94a3b8' }}>overlap time</span>
        </div>
      </div>
    )}

    <div className="controls">
      <label htmlFor="quality">Video Quality</label>
      <div className="input-group">
        <select
          id="quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--border-color)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '1rem',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <option value="low">Low (Faster, Memory Efficient)</option>
          <option value="high">High (Original Quality)</option>
        </select>
      </div>
    </div>

    {error && <div className="error-msg">{error}</div>}

    <button
      className="btn-primary"
      onClick={handleSubmit}
      disabled={loading || !file}
    >
      {loading ? (
        <>
          <span className="loading-spinner"></span>
          Processing...
        </>
      ) : (
        "Generate Video"
      )}
    </button>

    {videoUrl && (
      <div className="video-result">
        <h3>Your Video is Ready! ✨</h3>
        <video controls src={videoUrl} autoPlay loop></video>
        <div className="download-actions">
          <button className="btn-primary" onClick={handleDownload} style={{ marginTop: '1rem' }}>
            Download Video
          </button>
        </div>
      </div>
    )}
  </div>
)
}

export default App
