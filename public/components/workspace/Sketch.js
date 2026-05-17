function Sketch({ user }) {
  const canvasRef = React.useRef(null);
  const layerRef = React.useRef(new OffscreenCanvas(1, 1)); // Separate layer for drawings
  const [currentTool, setCurrentTool] = React.useState('brush');
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
  const [textFont, setTextFont] = React.useState('Arial');
  const [textSize, setTextSize] = React.useState(22);
  const [textBold, setTextBold] = React.useState(false);
  const [textItalic, setTextItalic] = React.useState(false);
  const canvasImageRef = React.useRef(null);
  const objectsRef = React.useRef([]);
  const draggingRef = React.useRef(null);
  const selectedObjIdRef = React.useRef(null);
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

  React.useEffect(() => {
    selectedObjIdRef.current = selectedObjId;
    redrawCanvas();
  }, [selectedObjId]);

  const shapeTools = ['line', 'ray', 'rectangle', 'circle', 'ellipse', 'triangle', 'diamond', 'arrow'];
  const fontOptions = ['Arial', 'Georgia', 'Verdana', 'Trebuchet MS', 'Courier New', 'Impact'];

  const getTextFont = (obj = {}) => {
    const style = `${obj.italic ? 'italic ' : ''}${obj.bold ? '700 ' : ''}`;
    return `${style}${obj.size || textSize}px ${obj.font || textFont}`;
  };

  const drawArrowHead = (ctx, fromX, fromY, toX, toY, color, lineWidth) => {
    const headlen = Math.max(10, lineWidth * 4);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const getRayEnd = (start, end) => {
    const canvas = canvasRef.current;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (!canvas || length < 2) return end;

    const unitX = dx / length;
    const unitY = dy / length;
    const candidates = [];

    if (unitX > 0) candidates.push((canvas.width - start.x) / unitX);
    if (unitX < 0) candidates.push((0 - start.x) / unitX);
    if (unitY > 0) candidates.push((canvas.height - start.y) / unitY);
    if (unitY < 0) candidates.push((0 - start.y) / unitY);

    const distance = Math.min(...candidates.filter((value) => value > 0));
    return {
      x: start.x + unitX * distance,
      y: start.y + unitY * distance
    };
  };

  const drawObject = (ctx, obj, isSelected = false) => {
    ctx.save();
    ctx.strokeStyle = obj.color || brushColor;
    ctx.fillStyle = obj.color || brushColor;
    ctx.lineWidth = obj.size || brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (obj.type === 'text') {
      ctx.font = getTextFont(obj);
      ctx.fillText(obj.text, obj.x, obj.y);
    } else if (obj.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(obj.x1, obj.y1);
      ctx.lineTo(obj.x2, obj.y2);
      ctx.stroke();
    } else if (obj.type === 'ray') {
      const rayEnd = getRayEnd({ x: obj.x1, y: obj.y1 }, { x: obj.x2, y: obj.y2 });
      ctx.beginPath();
      ctx.moveTo(obj.x1, obj.y1);
      ctx.lineTo(rayEnd.x, rayEnd.y);
      ctx.stroke();
      drawArrowHead(ctx, obj.x1, obj.y1, rayEnd.x, rayEnd.y, obj.color || brushColor, obj.size || brushSize);
      ctx.beginPath();
      ctx.arc(obj.x1, obj.y1, Math.max(3, (obj.size || brushSize) * 1.3), 0, Math.PI * 2);
      ctx.fill();
    } else if (obj.type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(obj.x1, obj.y1);
      ctx.lineTo(obj.x2, obj.y2);
      ctx.stroke();
      drawArrowHead(ctx, obj.x1, obj.y1, obj.x2, obj.y2, obj.color || brushColor, obj.size || brushSize);
    } else if (obj.type === 'rectangle') {
      ctx.strokeRect(obj.x1, obj.y1, obj.x2 - obj.x1, obj.y2 - obj.y1);
    } else if (obj.type === 'circle') {
      const radius = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      ctx.beginPath();
      ctx.arc(obj.x1, obj.y1, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (obj.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse((obj.x1 + obj.x2) / 2, (obj.y1 + obj.y2) / 2, Math.abs(obj.x2 - obj.x1) / 2, Math.abs(obj.y2 - obj.y1) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (obj.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo((obj.x1 + obj.x2) / 2, obj.y1);
      ctx.lineTo(obj.x2, obj.y2);
      ctx.lineTo(obj.x1, obj.y2);
      ctx.closePath();
      ctx.stroke();
    } else if (obj.type === 'diamond') {
      const midX = (obj.x1 + obj.x2) / 2;
      const midY = (obj.y1 + obj.y2) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, obj.y1);
      ctx.lineTo(obj.x2, midY);
      ctx.lineTo(midX, obj.y2);
      ctx.lineTo(obj.x1, midY);
      ctx.closePath();
      ctx.stroke();
    }

    if (isSelected) {
      const bounds = getObjectBounds(obj, ctx);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12);
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  const getObjectBounds = (obj, ctx = canvasRef.current?.getContext('2d')) => {
    if (obj.type === 'text') {
      if (ctx) ctx.font = getTextFont(obj);
      const metrics = ctx ? ctx.measureText(obj.text || '') : { width: 120 };
      return { x: obj.x, y: obj.y - (obj.size || textSize), width: Math.max(20, metrics.width), height: (obj.size || textSize) + 6 };
    }

    if (obj.type === 'circle') {
      const radius = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      return { x: obj.x1 - radius, y: obj.y1 - radius, width: radius * 2, height: radius * 2 };
    }

    if (obj.type === 'ray') {
      const rayEnd = getRayEnd({ x: obj.x1, y: obj.y1 }, { x: obj.x2, y: obj.y2 });
      return {
        x: Math.min(obj.x1, rayEnd.x),
        y: Math.min(obj.y1, rayEnd.y),
        width: Math.abs(rayEnd.x - obj.x1),
        height: Math.abs(rayEnd.y - obj.y1)
      };
    }

    return {
      x: Math.min(obj.x1, obj.x2),
      y: Math.min(obj.y1, obj.y2),
      width: Math.abs(obj.x2 - obj.x1),
      height: Math.abs(obj.y2 - obj.y1)
    };
  };

  const hitTestObject = (obj, coords, ctx) => {
    const bounds = getObjectBounds(obj, ctx);
    const pad = Math.max(8, (obj.size || brushSize) + 4);
    return coords.x >= bounds.x - pad &&
      coords.x <= bounds.x + bounds.width + pad &&
      coords.y >= bounds.y - pad &&
      coords.y <= bounds.y + bounds.height + pad;
  };

  const moveObject = (obj, dx, dy) => {
    if (obj.type === 'text') {
      obj.x += dx;
      obj.y += dy;
      return;
    }
    obj.x1 += dx;
    obj.y1 += dy;
    obj.x2 += dx;
    obj.y2 += dy;
  };

  const redrawCanvas = (previewObj = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear main canvas
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw layer
    ctx.drawImage(layerRef.current, 0, 0);

    // Draw movable objects with selection highlight
    objectsRef.current.forEach((obj) => {
      drawObject(ctx, obj, selectedObjIdRef.current === obj.id);
    });

    if (previewObj) drawObject(ctx, previewObj, false);
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const createShapeObject = (tool, from, to) => ({
    id: Date.now() + Math.random(),
    type: tool,
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    color: brushColor,
    size: brushSize
  });

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
    } else if (currentTool === 'eraser') {
      layerCtx.save();
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.beginPath();
      layerCtx.arc(coords.x, coords.y, Math.max(6, brushSize * 1.8), 0, Math.PI * 2);
      layerCtx.fill();
      layerCtx.beginPath();
      layerCtx.moveTo(coords.x, coords.y);
      layerCtx.restore();
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
      layerCtx.save();
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.lineWidth = Math.max(8, brushSize * 3);
      layerCtx.lineCap = 'round';
      layerCtx.lineJoin = 'round';
      layerCtx.lineTo(coords.x, coords.y);
      layerCtx.stroke();
      layerCtx.restore();

      const ctx = canvas.getContext('2d');
      const hitObject = [...objectsRef.current].reverse().find((obj) => hitTestObject(obj, coords, ctx));
      if (hitObject) {
        objectsRef.current = objectsRef.current.filter((obj) => obj.id !== hitObject.id);
        setObjects([...objectsRef.current]);
        if (selectedObjIdRef.current === hitObject.id) setSelectedObjId(null);
      }
      redrawCanvas();
    } else if (shapeTools.includes(currentTool)) {
      redrawCanvas(createShapeObject(currentTool, startPos, coords));
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

    if (shapeTools.includes(currentTool)) {
      const dx = Math.abs(coords.x - startPos.x);
      const dy = Math.abs(coords.y - startPos.y);
      if (dx > 4 || dy > 4) {
        const newObj = createShapeObject(currentTool, startPos, coords);
        objectsRef.current.push(newObj);
        setObjects([...objectsRef.current]);
        setSelectedObjId(newObj.id);
      }
    } else if (currentTool === 'brush' || currentTool === 'eraser') {
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

    if (currentTool === 'text') {
      handleCanvasClick(e);
      return;
    }

    if (currentTool === 'select') {
      handleCanvasSelectDown(e);
      return;
    }

    if (e.currentTarget && e.pointerId !== undefined && e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    startDrawing(e);
  };

  const handlePointerMove = (e) => {
    if (currentTool === 'select' && draggingRef.current) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        e.preventDefault();
      }
      const coords = getCanvasCoords(e);
      const drag = draggingRef.current;
      const obj = objectsRef.current.find((item) => item.id === drag.id);
      if (obj) {
        moveObject(obj, coords.x - drag.last.x, coords.y - drag.last.y);
        drag.last = coords;
        setObjects([...objectsRef.current]);
        redrawCanvas();
      }
      return;
    }

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

    draggingRef.current = null;
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

    draggingRef.current = null;
  };

  const handleCanvasSelectDown = (e) => {
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const clicked = [...objectsRef.current].reverse().find((obj) => hitTestObject(obj, coords, ctx));
    setSelectedObjId(clicked?.id || null);
    if (clicked) {
      draggingRef.current = { id: clicked.id, last: coords };
      if (e.currentTarget && e.pointerId !== undefined && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    redrawCanvas();
  };

  const handleCanvasClick = (e) => {
    if (currentTool === 'text') {
      const coords = getCanvasCoords(e);
      setStartPos(coords);
      setShowTextInput(true);
    } else if (currentTool === 'select') {
      handleCanvasSelectDown(e);
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
      size: textSize,
      color: brushColor,
      font: textFont,
      bold: textBold,
      italic: textItalic
    };

    objectsRef.current.push(newObj);
    setObjects([...objectsRef.current]);
    setTextInput('');
    setShowTextInput(false);
    setStartPos(null);
    redrawCanvas();
  };

  const deleteSelectedObject = () => {
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
      setObjects([...objectsRef.current]);
      redrawCanvas();
    }
  };

  const resizeSelectedText = (delta) => {
    const obj = objectsRef.current.find(o => o.id === selectedObjId);
    if (obj) {
      obj.size = Math.max(8, obj.size + delta);
      setObjects([...objectsRef.current]);
      redrawCanvas();
    }
  };

  const updateSelectedObject = (updates) => {
    const obj = objectsRef.current.find(o => o.id === selectedObjId);
    if (!obj) return;
    Object.assign(obj, updates);
    setObjects([...objectsRef.current]);
    redrawCanvas();
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
    const previousSelection = selectedObjIdRef.current;
    selectedObjIdRef.current = null;
    redrawCanvas();
    const sketchDataUrl = canvas.toDataURL('image/png');
    selectedObjIdRef.current = previousSelection;
    redrawCanvas();
    const imageBase64 = sketchDataUrl.split(',')[1];
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
      aiSettings: selectedCourse.aiSettings || {},
      completed: Boolean(selectedCourseState.completed),
      attemptCount: Number(selectedCourseState.questions || 0) + 1,
      repeatedInput: false
    };

    setLoading(true);
    
    try {
      if (window.LivelyChat && typeof window.LivelyChat.addUserSketch === 'function') {
        window.LivelyChat.addUserSketch(sketchDataUrl, {
          source: 'sketch',
          courseId: selectedCourseId
        });
      } else {
        window.LivelyProgress.addChatMessage({
          role: 'user',
          text: 'Sketch submitted',
          courseId: selectedCourseId,
          metadata: {
            type: 'sketch',
            imageUrl: sketchDataUrl,
            source: 'sketch'
          }
        });
      }

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
        if (objectiveResult.newlyCompleted?.length) {
          window.dispatchEvent(new CustomEvent('livelyPlaySfx', { detail: { type: 'success' } }));
        }
        if (objectiveResult.allComplete && !selectedCourseState.completed) {
          const completionText = `All objectives are cleared for ${selectedCourse.name}. Switch to chat to take the 10-question final test. You need at least 4/10 to complete the course.`;
          if (window.LivelyChat && typeof window.LivelyChat.addSystemMessage === 'function') {
            window.LivelyChat.addSystemMessage(completionText, { type: 'final_test_needed' });
          } else {
            window.LivelyProgress.addChatMessage({
              role: 'ai',
              text: completionText,
              courseId: selectedCourseId,
              metadata: { type: 'final_test_needed' }
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

  const selectedObj = objects.find((obj) => obj.id === selectedObjId) || null;

  return (
    <div className="flex flex-col h-full w-full gap-3 p-4 bg-discordDarkest">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-mcGreen">Sketch Board</h2>
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
        
        <select value={['rectangle', 'circle', 'ellipse', 'triangle', 'diamond', 'arrow'].includes(currentTool) ? currentTool : 'shapes'} onChange={(e) => {
          if (e.target.value !== 'shapes') setCurrentTool(e.target.value);
        }} className={`px-3 py-2 rounded text-xs font-mono bg-discordDarkest border cursor-pointer ${['rectangle', 'circle', 'ellipse', 'triangle', 'diamond', 'arrow'].includes(currentTool) ? 'bg-mcGreen text-black font-bold border-mcGreen' : 'text-gray-300 border-gray-600 hover:border-gray-500'}`}>
          <option value="shapes">Shapes</option>
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="ellipse">Ellipse</option>
          <option value="triangle">Triangle</option>
          <option value="diamond">Diamond</option>
          <option value="arrow">Arrow</option>
        </select>
        
        <button onClick={() => setCurrentTool('text')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'text' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Text"><div className="icon-type text-sm"></div></button>
        
        <button onClick={() => setCurrentTool('select')} className={`px-3 py-2 rounded text-xs font-mono ${currentTool === 'select' ? 'bg-mcGreen text-black font-bold' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Select"><div className="icon-mouse-pointer text-sm"></div></button>

        <select
          value={textFont}
          onChange={(e) => setTextFont(e.target.value)}
          className="min-w-[130px] rounded border border-gray-600 bg-discordDarkest px-2 py-2 text-xs font-mono text-gray-200"
          title="Text font"
        >
          {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded border border-gray-600 bg-discordDarkest px-2 py-1 text-xs font-mono text-gray-300">
          Text
          <input
            type="number"
            min="10"
            max="72"
            value={textSize}
            onChange={(e) => setTextSize(Math.max(10, Math.min(72, Number(e.target.value) || 10)))}
            className="w-14 rounded border border-gray-700 bg-black/30 px-2 py-1 text-gray-200"
          />
        </label>
        <button onClick={() => setTextBold((value) => !value)} className={`px-3 py-2 rounded text-xs font-mono font-bold ${textBold ? 'bg-mcGreen text-black' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Bold">B</button>
        <button onClick={() => setTextItalic((value) => !value)} className={`px-3 py-2 rounded text-xs font-mono italic ${textItalic ? 'bg-mcGreen text-black' : 'bg-discordDarkest text-gray-300 border border-gray-600 hover:bg-gray-700'}`} title="Italic">I</button>
      </div>

      {/* Object Editing Controls */}
      {selectedObj && !isCourseCompleted && (
        <div className="bg-discordDarker p-2 rounded border border-yellow-500 flex flex-wrap gap-2 items-center">
          <span className="rounded bg-yellow-500/10 px-2 py-1 text-xs font-mono uppercase tracking-wide text-yellow-300">
            {selectedObj.type}
          </span>
          {selectedObj.type === 'text' ? (
            <>
              <input type="text" value={selectedObj.text} onChange={(e) => editSelectedText(e.target.value)} className="min-w-[220px] flex-1 bg-discordDarkest border border-gray-600 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:border-mcGreen" />
              <select value={selectedObj.font || textFont} onChange={(e) => updateSelectedObject({ font: e.target.value })} className="rounded border border-gray-600 bg-discordDarkest px-2 py-1 text-xs text-gray-200">
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
              <button onClick={() => updateSelectedObject({ bold: !selectedObj.bold })} className={`px-2 py-1 rounded text-xs font-bold ${selectedObj.bold ? 'bg-mcGreen text-black' : 'bg-gray-700 text-white'}`}>B</button>
              <button onClick={() => updateSelectedObject({ italic: !selectedObj.italic })} className={`px-2 py-1 rounded text-xs italic ${selectedObj.italic ? 'bg-mcGreen text-black' : 'bg-gray-700 text-white'}`}>I</button>
              <button onClick={() => resizeSelectedText(2)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs">A+</button>
              <button onClick={() => resizeSelectedText(-2)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs">A-</button>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-gray-300">
            Color
            <input type="color" value={selectedObj.color || brushColor} onChange={(e) => updateSelectedObject({ color: e.target.value })} className="h-8 w-10 rounded" />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300">
            Stroke
            <input type="range" min="1" max="20" value={selectedObj.size || brushSize} onChange={(e) => updateSelectedObject({ size: Number(e.target.value) })} className="w-20" />
          </label>
          <button onClick={deleteSelectedObject} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs">Del</button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        onClick={(e) => { if (currentTool === 'text') handleCanvasClick(e); }}
        className={`flex-1 border-2 border-gray-700 rounded-lg bg-discordDarker shadow-lg touch-none ${isCourseCompleted ? 'cursor-not-allowed opacity-80 pointer-events-none' : currentTool === 'select' ? 'cursor-move' : currentTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
      />

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discordDarkest border-2 border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Add Text</h3>
            <input autoFocus type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTextToCanvas(); if (e.key === 'Escape') { setShowTextInput(false); setTextInput(''); setStartPos(null); }}} placeholder="Enter text..." className="w-full bg-discordDarker border border-gray-600 rounded px-3 py-2 text-gray-200 mb-4 focus:outline-none focus:border-mcGreen" />
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select value={textFont} onChange={(e) => setTextFont(e.target.value)} className="rounded border border-gray-600 bg-discordDarker px-3 py-2 text-gray-200">
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
              <input type="number" min="10" max="72" value={textSize} onChange={(e) => setTextSize(Math.max(10, Math.min(72, Number(e.target.value) || 10)))} className="rounded border border-gray-600 bg-discordDarker px-3 py-2 text-gray-200" />
            </div>
            <div className="mb-4 flex gap-2">
              <button onClick={() => setTextBold((value) => !value)} className={`px-3 py-2 rounded text-xs font-bold ${textBold ? 'bg-mcGreen text-black' : 'bg-gray-700 text-white'}`}>Bold</button>
              <button onClick={() => setTextItalic((value) => !value)} className={`px-3 py-2 rounded text-xs italic ${textItalic ? 'bg-mcGreen text-black' : 'bg-gray-700 text-white'}`}>Italic</button>
            </div>
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
