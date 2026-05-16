function Sketch({ user }) {
  const canvasRef = React.useRef(null);
  const layerRef = React.useRef(new OffscreenCanvas(1, 1)); // Separate layer for drawings
  const [currentTool, setCurrentTool] = React.useState('brush');
  const [shapeType, setShapeType] = React.useState('rectangle');
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [brushSize, setBrushSize] = React.useState(3);
  const [brushColor, setBrushColor] = React.useState('#ffffff');
  const [startPos, setStartPos] = React.useState(null);
  const [textInput, setTextInput] = React.useState('');
  const [showTextInput, setShowTextInput] = React.useState(false);
  const [selectedObjId, setSelectedObjId] = React.useState(null);
  const [objects, setObjects] = React.useState([]);
  const [analysis, setAnalysis] = React.useState([]);
  const canvasImageRef = React.useRef(null);
  const objectsRef = React.useRef([]);
  const progress = window.LivelyProgress.useProgress();
  const activeCourse = window.LivelyProgress.getSelectedCourse();
  const activeCourseState = progress.courseProgress?.[activeCourse.id] || {};
  const isCourseCompleted = Boolean(activeCourseState.completed);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with dark background
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Setup offscreen layer
    layerRef.current = new OffscreenCanvas(canvas.width, canvas.height);
    const layerCtx = layerRef.current.getContext('2d');
    layerCtx.fillStyle = '#1e1f22';
    layerCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasImageRef.current = layerCtx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const layerCtx = layerRef.current.getContext('2d');

    // Clear main canvas
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw layer
    ctx.drawImage(layerRef.current, 0, 0);

    // Draw objects with selection highlight
    objectsRef.current.forEach((obj) => {
      if (obj.type === 'text') {
        ctx.fillStyle = obj.color;
        ctx.font = `${obj.size}px Arial`;
        ctx.fillText(obj.text, obj.x, obj.y);

        if (selectedObjId === obj.id) {
          const metrics = ctx.measureText(obj.text);
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(obj.x - 5, obj.y - obj.size, metrics.width + 10, obj.size + 10);
        }
      }
    });
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, color, lineWidth) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const startDrawing = (e) => {
    if (currentTool === 'text' || currentTool === 'select') return;

    const canvas = canvasRef.current;
    const layerCtx = layerRef.current.getContext('2d');
    const coords = getCanvasCoords(e);

    setIsDrawing(true);
    setStartPos(coords);
    canvasImageRef.current = layerCtx.getImageData(0, 0, canvas.width, canvas.height);

    if (currentTool === 'brush') {
      layerCtx.beginPath();
      layerCtx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e) => {
    if (!isDrawing || currentTool === 'text' || currentTool === 'select') return;

    const canvas = canvasRef.current;
    const layerCtx = layerRef.current.getContext('2d');
    const coords = getCanvasCoords(e);

    if (currentTool === 'brush') {
      layerCtx.lineWidth = brushSize;
      layerCtx.lineCap = 'round';
      layerCtx.lineJoin = 'round';
      layerCtx.strokeStyle = brushColor;
      layerCtx.lineTo(coords.x, coords.y);
      layerCtx.stroke();
      redrawCanvas();
    } else if (currentTool === 'eraser') {
      layerCtx.clearRect(coords.x - brushSize, coords.y - brushSize, brushSize * 2, brushSize * 2);
      redrawCanvas();
    } else if (['line', 'ray', ...Object.keys({rectangle: true, circle: true})].includes(currentTool)) {
      // Preview
      layerCtx.putImageData(canvasImageRef.current, 0, 0);

      layerCtx.strokeStyle = brushColor;
      layerCtx.lineWidth = brushSize;
      layerCtx.fillStyle = 'transparent';

      const dx = coords.x - startPos.x;
      const dy = coords.y - startPos.y;

      if (currentTool === 'line') {
        layerCtx.beginPath();
        layerCtx.moveTo(startPos.x, startPos.y);
        layerCtx.lineTo(coords.x, coords.y);
        layerCtx.stroke();
      } else if (currentTool === 'ray') {
        // Ray with arrowhead
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          const extendedX = startPos.x + (dx / distance) * (distance + 500);
          const extendedY = startPos.y + (dy / distance) * (distance + 500);
          drawArrow(layerCtx, startPos.x, startPos.y, extendedX, extendedY, brushColor, brushSize);

          // Start point circle
          layerCtx.fillStyle = brushColor;
          layerCtx.beginPath();
          layerCtx.arc(startPos.x, startPos.y, brushSize * 1.5, 0, Math.PI * 2);
          layerCtx.fill();
        }
      } else if (currentTool === 'rectangle') {
        layerCtx.strokeRect(startPos.x, startPos.y, dx, dy);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        layerCtx.beginPath();
        layerCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        layerCtx.stroke();
      }

      redrawCanvas();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing || currentTool === 'text' || currentTool === 'select') {
      setIsDrawing(false);
      return;
    }

    const canvas = canvasRef.current;
    const layerCtx = layerRef.current.getContext('2d');
    const coords = getCanvasCoords(e);

    if (['line', 'ray', 'rectangle', 'circle'].includes(currentTool)) {
      layerCtx.putImageData(canvasImageRef.current, 0, 0);

      layerCtx.strokeStyle = brushColor;
      layerCtx.lineWidth = brushSize;
      layerCtx.fillStyle = 'transparent';

      const dx = coords.x - startPos.x;
      const dy = coords.y - startPos.y;

      if (currentTool === 'line') {
        layerCtx.beginPath();
        layerCtx.moveTo(startPos.x, startPos.y);
        layerCtx.lineTo(coords.x, coords.y);
        layerCtx.stroke();
      } else if (currentTool === 'ray') {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          const extendedX = startPos.x + (dx / distance) * (distance + 500);
          const extendedY = startPos.y + (dy / distance) * (distance + 500);
          drawArrow(layerCtx, startPos.x, startPos.y, extendedX, extendedY, brushColor, brushSize);
          layerCtx.fillStyle = brushColor;
          layerCtx.beginPath();
          layerCtx.arc(startPos.x, startPos.y, brushSize * 1.5, 0, Math.PI * 2);
          layerCtx.fill();
        }
      } else if (currentTool === 'rectangle') {
        layerCtx.strokeRect(startPos.x, startPos.y, dx, dy);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        layerCtx.beginPath();
        layerCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        layerCtx.stroke();
      }

      canvasImageRef.current = layerCtx.getImageData(0, 0, canvas.width, canvas.height);
    }

    setIsDrawing(false);
    setStartPos(null);
    redrawCanvas();
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      e.preventDefault();
    }

    if (currentTool === 'text' || currentTool === 'select') {
      handleCanvasClick(e);
      return;
    }

    if (e.currentTarget && e.pointerId !== undefined && e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    startDrawing(e);
  };

  const handlePointerMove = (e) => {
    if (isDrawing) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        e.preventDefault();
      }
      draw(e);
    }
  };

  const handlePointerUp = (e) => {
    if (isDrawing) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        e.preventDefault();
      }
      stopDrawing(e);
    }

    if (e.currentTarget && e.pointerId !== undefined && e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (error) {
        // Ignore if capture was already released
      }
    }
  };

  const handlePointerCancel = (e) => {
    if (isDrawing) {
      stopDrawing(e);
    }

    if (e.currentTarget && e.pointerId !== undefined && e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (error) {
        // Ignore if capture was already released
      }
    }
  };

  const handleCanvasClick = (e) => {
    if (currentTool === 'text') {
      const coords = getCanvasCoords(e);
      setStartPos(coords);
      setShowTextInput(true);
    } else if (currentTool === 'select') {
      const coords = getCanvasCoords(e);
      const clicked = objectsRef.current.find((obj) => {
        if (obj.type === 'text') {
          return coords.x >= obj.x - 5 && coords.y >= obj.y - obj.size && 
                 coords.x <= obj.x + 200 && coords.y <= obj.y + 10;
        }
        return false;
      });
      setSelectedObjId(clicked?.id || null);
      redrawCanvas();
    }
  };

  const addTextToCanvas = () => {
    if (!textInput.trim() || !startPos) return;

    const newObj = {
      id: Date.now(),
      type: 'text',
      text: textInput,
      x: startPos.x,
      y: startPos.y,
      size: Math.max(12, brushSize * 4),
      color: brushColor
    };

    objectsRef.current.push(newObj);
    setObjects([...objectsRef.current]);
    setTextInput('');
    setShowTextInput(false);
    setStartPos(null);
    redrawCanvas();
  };

  const deleteSelectedText = () => {
    if (!selectedObjId) return;
    objectsRef.current = objectsRef.current.filter(obj => obj.id !== selectedObjId);
    setObjects([...objectsRef.current]);
    setSelectedObjId(null);
    redrawCanvas();
  };

  const editSelectedText = (newText) => {
    const obj = objectsRef.current.find(o => o.id === selectedObjId);
    if (obj) {
      obj.text = newText;
      redrawCanvas();
    }
  };

  const resizeSelectedText = (delta) => {
    const obj = objectsRef.current.find(o => o.id === selectedObjId);
    if (obj) {
      obj.size = Math.max(8, obj.size + delta);
      redrawCanvas();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const layerCtx = layerRef.current.getContext('2d');
    
    canvas.getContext('2d').fillStyle = '#1e1f22';
    canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
    
    layerCtx.fillStyle = '#1e1f22';
    layerCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    objectsRef.current = [];
    setObjects([]);
    setSelectedObjId(null);
  };

  const sendSketch = async () => {
    if (isCourseCompleted) return;
    const canvas = canvasRef.current;
    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
    const selectedCourse = window.LivelyProgress.getSelectedCourse();
    const selectedCourseId = selectedCourse.id;
    const progressSnapshot = window.LivelyProgress.getState();
    const selectedCourseState = progressSnapshot?.courseProgress?.[selectedCourseId] || { questions: 0, completed: false };
    const courseContext = {
      id: selectedCourse.id,
      title: selectedCourse.name,
      subject: selectedCourse.subject,
      grade: selectedCourse.grade,
      topic: selectedCourse.focus,
      aiAim: selectedCourse.aiAim,
      objectives: Array.isArray(selectedCourse.objectives) ? selectedCourse.objectives : [],
      objectiveStatus: Array.isArray(selectedCourseState.objectiveStatus) ? selectedCourseState.objectiveStatus : [],
      cardStyle: selectedCourse.cardStyle || {},
      completed: Boolean(selectedCourseState.completed),
      attemptCount: Number(selectedCourseState.questions || 0) + 1,
      repeatedInput: false
    };

    setLoading(true);
    
    try {
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
          sketchSummary = (visionData && visionData.text) ? visionData.text : 'Sketch analyzed successfully.';
        } catch (parseError) {
          sketchSummary = 'Sketch analyzed successfully.';
        }
      } else {
        sketchSummary = 'Sketch analyzed successfully.';
      }

      const chatPrompt = `The student is studying ${selectedCourse.name}. Here is what the sketch looks like: ${sketchSummary}. Reply naturally with one helpful message that stays focused on ${selectedCourse.focus}. The current objectives are: ${(courseContext.objectives || []).join(' | ') || 'none listed'}. Give the student-safe response and decide whether the sketch should award, reduce, or complete progress.`;

      let finalChatResponse = '';
      let aiDecision = null;
      
      try {
        const chatResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: `You are Buddy_AI helping with ${selectedCourse.name}. Keep it natural and friendly, like a friend studying together. Use the course objectives to guide your scoring.`,
            userText: chatPrompt,
            courseContext,
            mode: 'sketch'
          })
        });
        
        if (chatResponse.ok) {
          try {
            const chatData = await chatResponse.json();
            if (chatData && chatData.text) {
              finalChatResponse = chatData.text;
              aiDecision = chatData.decision || null;
            }
          } catch (parseError) {
            // Continue
          }
        }
      } catch (chatError) {
        // Continue
      }

      const followUpMsg = finalChatResponse || `I looked at your sketch and it seems connected to ${selectedCourse.focus.toLowerCase()}. What part do you want to work through?`;
      const combinedMsg = followUpMsg;
      
      if (window.LivelyChat && typeof window.LivelyChat.addAssistantMessage === 'function') {
        window.LivelyChat.addAssistantMessage(combinedMsg, { aiDecision });
      } else {
        window.LivelyProgress.addChatMessage({
          role: 'ai',
          text: combinedMsg,
          courseId: selectedCourseId,
          metadata: { aiDecision }
        });
      }

      if (window.LivelyProgress) {
        const xpReward = Number(aiDecision?.xp_delta ?? 20);
        const coinReward = Number(aiDecision?.coins_delta ?? (xpReward > 0 ? 4 : 0));
        window.LivelyProgress.awardProgress({
          xp: xpReward,
          coins: coinReward,
          correct: xpReward > 0,
          courseId: selectedCourseId,
          source: 'sketch',
          decision: aiDecision
        });

        const objectiveResult = await window.LivelyProgress.markObjectiveProgress(selectedCourseId, aiDecision || {});
        if (objectiveResult.allComplete && !selectedCourseState.completed) {
          await window.LivelyProgress.completeCourse(selectedCourseId);
          const completionText = `Course completed: ${selectedCourse.name}. Brilliant work. All objectives are checked off, so this course is now locked as completed. You can reopen it anytime from your profile to review, but you cannot continue it.`;
          if (window.LivelyChat && typeof window.LivelyChat.addSystemMessage === 'function') {
            window.LivelyChat.addSystemMessage(completionText, { type: 'course_completed' });
          } else {
            window.LivelyProgress.addChatMessage({
              role: 'ai',
              text: completionText,
              courseId: selectedCourseId,
              metadata: { type: 'course_completed' }
            });
          }
        }
      }

      if (window.LivelyWorkspace && typeof window.LivelyWorkspace.switchToChat === 'function') {
        window.LivelyWorkspace.switchToChat();
      }

    } catch (error) {
      console.error('[Sketch] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-3 p-4 bg-discordDarkest">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-mcGreen">✏️ Sketch Board</h2>
        {isCourseCompleted ? (
          <span className="rounded border border-mcGreen/40 bg-mcGreen/10 px-3 py-1 text-xs font-mono text-mcGreen">
            COMPLETED - READ ONLY
          </span>
        ) : null}
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            Size:
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              disabled={isCourseCompleted}
              className="w-20"
            />
            <span className="text-xs font-mono">{brushSize}</span>
          </label>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            disabled={isCourseCompleted}
            className="w-10 h-8 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Tool Palette */}
      <div className={`flex gap-2 flex-wrap bg-discordDarker p-2 rounded-lg border border-gray-700 ${isCourseCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
        <button onClick={() => setCurrentTool('brush')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'brush' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Brush"><div className="icon-pen-tool text-sm"></div></button>
        
        <button onClick={() => setCurrentTool('eraser')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'eraser' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Eraser"><div className="icon-eraser text-sm"></div></button>
        
        <button onClick={() => setCurrentTool('line')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'line' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Line"><div className="icon-minus text-sm"></div></button>
        
        <button onClick={() => setCurrentTool('ray')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'ray' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Ray"><div className="icon-arrow-right text-sm"></div></button>
        
        <select value={['rectangle', 'circle'].includes(currentTool) ? currentTool : 'shapes'} onChange={(e) => {
          if (e.target.value !== 'shapes') setCurrentTool(e.target.value);
        }} className={`px-3 py-2 rounded text-xs font-mono bg-discordDarkest border cursor-pointer ${['rectangle', 'circle'].includes(currentTool) ? 'bg-mcGreen text-black font-bold border-mcGreen' : 'text-gray-300 border-gray-600 hover:border-gray-500'}`}>
          <option value="shapes">Shapes ▼</option>
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
        </select>
        
        <button onClick={() => setCurrentTool('text')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'text' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Text"><div className="icon-type text-sm"></div></button>
        
        <button onClick={() => setCurrentTool('select')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'select' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Select"><div className="icon-mouse-pointer text-sm"></div></button>
      </div>

      {/* Text Editing Controls */}
      {selectedObjId && !isCourseCompleted && (
        <div className="bg-discordDarker p-2 rounded border border-yellow-500 flex gap-2 items-center">
          <input type="text" placeholder="Edit text..." onChange={(e) => editSelectedText(e.target.value)} className="flex-1 bg-discordDarkest border border-gray-600 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:border-mcGreen" />
          <button onClick={() => resizeSelectedText(1)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs">A+</button>
          <button onClick={() => resizeSelectedText(-1)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs">A-</button>
          <button onClick={deleteSelectedText} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs">Del</button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        onClick={handleCanvasClick}
        className={`flex-1 border-2 border-gray-700 rounded-lg bg-discordDarker shadow-lg touch-none ${isCourseCompleted ? 'cursor-not-allowed opacity-80 pointer-events-none' : 'cursor-crosshair'}`}
      />

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discordDarkest border-2 border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Add Text</h3>
            <input autoFocus type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTextToCanvas(); if (e.key === 'Escape') { setShowTextInput(false); setTextInput(''); setStartPos(null); }}} placeholder="Enter text..." className="w-full bg-discordDarker border border-gray-600 rounded px-3 py-2 text-gray-200 mb-4 focus:outline-none focus:border-mcGreen" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowTextInput(false); setTextInput(''); setStartPos(null); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">Cancel</button>
              <button onClick={addTextToCanvas} className="px-4 py-2 bg-mcGreen hover:bg-green-400 rounded text-black font-bold">Add</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-between">
        <button onClick={clearCanvas} disabled={isCourseCompleted} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-mono text-sm transition-colors">CLEAR</button>
        <button onClick={sendSketch} disabled={loading || isCourseCompleted} className="px-6 py-2 bg-mcGreen hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded font-mono transition-colors">{isCourseCompleted ? 'COURSE LOCKED' : loading ? 'ANALYZING...' : 'SEND SKETCH'}</button>
      </div>
    </div>
  );
}
