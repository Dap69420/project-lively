function Sketch({ user }) {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [brushSize, setBrushSize] = React.useState(3);
  const [brushColor, setBrushColor] = React.useState('#ffffff');

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with dark background
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setAnalysis([]);
  };

  const sendSketch = async () => {
    const canvas = canvasRef.current;
    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
    const selectedCourse = window.LivelyProgress.getSelectedCourse();
    const selectedCourseId = selectedCourse.id;

    setLoading(true);
    console.log('[Sketch] Starting analysis for course:', selectedCourseId);
    
    try {
      // Step 1: Analyze the sketch with vision API
      console.log('[Sketch] Calling /api/ai/vision...');
      const visionResponse = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          prompt: 'Analyze this sketch. What do you see? Describe the shape, structure, and any mathematical or scientific concepts it might represent.'
        })
      });

      let sketchSummary = '';
      if (visionResponse.ok) {
        try {
          const visionData = await visionResponse.json();
          sketchSummary = (visionData && visionData.text) ? visionData.text : localAnalyze(canvas);
          console.log('[Sketch] Vision analysis received:', sketchSummary.substring(0, 100) + '...');
        } catch (parseError) {
          console.error('[Sketch] Failed to parse vision response:', parseError);
          sketchSummary = localAnalyze(canvas);
        }
      } else {
        console.warn('[Sketch] Vision API returned non-ok status:', visionResponse.status);
        sketchSummary = localAnalyze(canvas);
      }

      // Step 2: Add sketch summary to chat via window.LivelyChat (for immediate UI) and progression (for persistence)
      const summaryMsg = `I looked at your sketch for ${selectedCourse.name}: ${sketchSummary}`;
      console.log('[Sketch] Adding summary message to chat');
      
      if (window.LivelyChat && typeof window.LivelyChat.addAssistantMessage === 'function') {
        window.LivelyChat.addAssistantMessage(summaryMsg);
      } else {
        console.warn('[Sketch] window.LivelyChat not available, persisting directly');
      }
      
      // Always persist to progression
      window.LivelyProgress.addChatMessage({
        role: 'ai',
        text: summaryMsg,
        courseId: selectedCourseId
      });

      // Step 3: Get follow-up response from chat API
      console.log('[Sketch] Calling /api/ai/chat for follow-up...');
      const chatPrompt = `The student just drew something for the ${selectedCourse.name} course. Here is the sketch summary: ${sketchSummary}. Reply like a real friend who is helping them learn. Start naturally and do not mention that you are a model.`;

      let finalChatResponse = '';
      let chatProvider = 'none';
      
      try {
        const chatResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: `You are Buddy_AI helping with ${selectedCourse.name}. Keep it natural and friendly, like a friend studying together.`,
            userText: chatPrompt
          })
        });
        
        console.log('[Sketch] Chat API response status:', chatResponse.status);
        
        if (chatResponse.ok) {
          try {
            const chatData = await chatResponse.json();
            if (chatData && chatData.text) {
              finalChatResponse = chatData.text;
              chatProvider = chatData.provider || 'sambanova';
              console.log('[Sketch] Chat response received from', chatProvider, ':', finalChatResponse.substring(0, 100) + '...');
            } else {
              console.warn('[Sketch] Chat response missing text field:', chatData);
            }
          } catch (parseError) {
            console.error('[Sketch] Failed to parse chat response:', parseError);
          }
        } else {
          console.error('[Sketch] Chat API returned status:', chatResponse.status);
        }
      } catch (chatError) {
        console.error('[Sketch] Chat API call failed:', chatError);
      }

      // Step 4: Add follow-up response to chat
      const followUpMsg = finalChatResponse || `Nice sketch. I think you are exploring ${selectedCourse.focus.toLowerCase()}. Want to talk it through together?`;
      console.log('[Sketch] Adding follow-up message:', followUpMsg.substring(0, 50) + '...');
      
      if (window.LivelyChat && typeof window.LivelyChat.addAssistantMessage === 'function') {
        window.LivelyChat.addAssistantMessage(followUpMsg);
      }
      
      // Always persist to progression
      window.LivelyProgress.addChatMessage({
        role: 'ai',
        text: followUpMsg,
        courseId: selectedCourseId
      });

      // Step 5: Update analysis display
      setAnalysis([
        {
          id: Date.now(),
          text: `Sketch summary: ${sketchSummary}`,
          provider: chatProvider,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Step 6: Award progress
      if (window.LivelyProgress) {
        const xpReward = 20;
        const coinReward = 4;
        window.LivelyProgress.awardProgress({
          xp: xpReward,
          coins: coinReward,
          correct: true,
          courseId: selectedCourseId,
          source: 'sketch'
        });
        console.log('[Sketch] Awarded', xpReward, 'XP and', coinReward, 'coins');
      }

      // Step 7: Switch to chat tab
      console.log('[Sketch] Switching to chat tab');
      if (window.LivelyWorkspace && typeof window.LivelyWorkspace.switchToChat === 'function') {
        window.LivelyWorkspace.switchToChat();
      } else {
        console.warn('[Sketch] window.LivelyWorkspace.switchToChat not available');
      }

    } catch (error) {
      console.error('[Sketch] Sketch analysis error:', error);
      const local = localAnalyze(canvas);
      setAnalysis([
        {
          id: Date.now(),
          text: local || 'Error analyzing sketch. Please try again.',
          provider: 'local-fallback',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Heuristic local analysis: bounding box, non-background pixel count, dominant color
  function localAnalyze(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const data = img.data;

      // background color assumed #1e1f22 ~ rgb(30,31,34)
      const bg = { r: 30, g: 31, b: 34 };
      let nonBg = 0;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      const colorCount = {};

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          // treat semi-transparent as drawn
          if (a < 16) continue;
          const dr = Math.abs(r - bg.r), dg = Math.abs(g - bg.g), db = Math.abs(b - bg.b);
          if (dr + dg + db > 30) {
            nonBg++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            const key = `${r},${g},${b}`;
            colorCount[key] = (colorCount[key] || 0) + 1;
          }
        }
      }

      const area = w * h;
      const drawnRatio = +(nonBg / area).toFixed(3);
      let dominant = null;
      let top = 0;
      for (const k in colorCount) {
        if (colorCount[k] > top) {
          top = colorCount[k]; dominant = k;
        }
      }

      const bbox = (minX <= maxX && minY <= maxY) ? `${minX},${minY} → ${maxX},${maxY}` : 'none';
      const approxShapes = drawnRatio < 0.001 ? 'blank' : drawnRatio < 0.02 ? 'sparse lines' : 'dense strokes';

      const domHex = dominant ? ('#' + dominant.split(',').map(n => Number(n).toString(16).padStart(2,'0')).join('')) : '#ffffff';

      return `Local analysis: ${approxShapes}. Drawn pixels: ${nonBg} (${Math.round(drawnRatio*100)}%). Bounding box: ${bbox}. Dominant color: ${domHex}.`;
    } catch (e) {
      console.error('localAnalyze error', e);
      return null;
    }
  }
  

  return (
    <div className="flex flex-col h-full w-full gap-4 p-4 bg-discordDarkest">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-mcGreen">✏️ Sketch Board</h2>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            Brush:
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
            />
          </label>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="flex-1 border-2 border-gray-700 rounded-lg bg-discordDarker cursor-crosshair shadow-lg"
      />

      <div className="flex gap-2 justify-between">
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-mono text-sm transition-colors"
        >
          CLEAR
        </button>
        <button
          onClick={sendSketch}
          disabled={loading}
          className="px-6 py-2 bg-mcGreen hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded font-mono transition-colors"
        >
          {loading ? 'ANALYZING...' : 'SEND SKETCH'}
        </button>
      </div>

      {/* Analysis Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-discordDarker rounded-lg border border-gray-700 p-4">
        {analysis.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            Draw something and click SEND SKETCH to analyze it with AI vision
          </div>
        ) : (
          <div className="space-y-4">
            {analysis.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded ${
                  msg.provider === 'error'
                    ? 'bg-red-900/30 border border-red-500/50 text-red-200'
                    : 'bg-blue-900/30 border border-blue-500/50 text-blue-100'
                }`}
              >
                <div className="text-xs text-gray-400 mb-1">
                  {msg.timestamp} • {msg.provider}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
