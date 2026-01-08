import { useState, useRef, useEffect } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [duration, setDuration] = useState(5) // Default 5 seconds
  const [transitions, setTransitions] = useState(["none"])

  const [transitionDuration, setTransitionDuration] = useState(1.0)
  const [quality, setQuality] = useState("low")
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [clientId] = useState(() => 'client_' + Math.random().toString(36).substr(2, 9))
  const fileInputRef = useRef(null)
  const ws = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const [pageCount, setPageCount] = useState(0)

  const handleFile = (selectedFile) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file.")
      setFile(null)
      setPageCount(0)
      return
    }
    setError(null)
    setFile(selectedFile)
    setVideoUrl(null)

    // Count pages using regex (simple but effective for an estimate)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      // This regex looks for /Type /Page tags in the PDF source
      const matches = content.match(/\/Type\s*\/Page\b/g)
      if (matches) {
        setPageCount(matches.length)
      } else {
        // Fallback or if parsing failed, assume 1
        setPageCount(1)
      }
    }
    reader.readAsText(selectedFile)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return "0s"
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const estimatedDuration = pageCount * duration

  useEffect(() => {
    // Connect to WebSocket
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
    const wsUrl = API_URL.replace('http', 'ws') + `/ws/${clientId}`

    ws.current = new WebSocket(wsUrl)

    ws.current.onmessage = (event) => {
      const message = event.data
      if (message.startsWith("progress:")) {
        const percent = parseInt(message.split(":")[1])
        setProgress(percent)
      }
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [clientId])

  const availableTransitions = [
    { id: "none", name: "None (Cut)" },
    { id: "crossfade", name: "Crossfade (Overlap)" },
    { id: "fadeinout", name: "Dip to Black" },
    { id: "zoom_in", name: "Zoom In" },
    { id: "slide_left", name: "Slide Left" },
    { id: "slide_right", name: "Slide Right" },
    { id: "slide_up", name: "Slide Up" },
    { id: "slide_down", name: "Slide Down" },
  ]

  const toggleTransition = (id) => {
    setTransitions(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1 && prev[0] === id) return prev // Keep at least one
        return prev.filter(t => t !== id)
      }
      return [...prev, id]
    })
  }

  const handleSubmit = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setProgress(0)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("duration", duration)
    const transitionParam = transitions.length > 0 ? transitions.join(",") : "none"
    formData.append("transition", transitionParam)
    formData.append("transition_duration", transitionDuration)
    formData.append("quality", quality)
    formData.append("client_id", clientId)

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
      setProgress(0)
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

      {pageCount > 0 && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '2px' }}>Total Pages</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{pageCount}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '2px' }}>Estimated Length</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#818cf8' }}>
              {formatDuration(estimatedDuration)}
            </div>
          </div>
        </div>
      )}

      <div className="controls">
        <label>Transition Effects (randomly picked from selection)</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {availableTransitions.map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, color: 'white' }}>
              <input
                type="checkbox"
                checked={transitions.includes(t.id)}
                onChange={() => toggleTransition(t.id)}
              />
              {t.name}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setTransitions(availableTransitions.map(t => t.id))}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--border-color)' }}
          > Select All </button>
          <button
            type="button"
            onClick={() => setTransitions(["none"])}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--border-color)' }}
          > Clear All </button>
        </div>
      </div>

      {transitions.some(t => t !== "none") && (
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
        style={
          loading && progress > 0
            ? {
              background: `linear-gradient(to right, #10b981 ${progress}%, #64748b ${progress}%)`,
              backgroundSize: '100% 100%',
              transition: 'background 0.5s ease',
            }
            : {}
        }
      >
        {loading ? (
          <>
            <span className="loading-spinner"></span>
            {progress > 0 ? `Generating ${progress}%` : "Processing..."}
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
