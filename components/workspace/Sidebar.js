function Sidebar() {
  try {
    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('notes'); // notes, sketch

    React.useEffect(() => {
      if (activeTab === 'sketch' && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, [activeTab]);

    const startDrawing = (e) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    return (
      <div className="w-72 bg-discordDarker border-r border-black/20 flex flex-col h-full" data-name="sidebar" data-file="components/workspace/Sidebar.js">
        <div className="p-4 flex gap-2 border-b border-black/20">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 rounded-md font-mono text-xs flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-discordDark text-white' : 'text-gray-400 hover:bg-discordDarkest'}`}
          >
            <div className="icon-file-text"></div> NOTES
          </button>
          <button 
            onClick={() => setActiveTab('sketch')}
            className={`flex-1 py-2 rounded-md font-mono text-xs flex items-center justify-center gap-2 ${activeTab === 'sketch' ? 'bg-discordDark text-white' : 'text-gray-400 hover:bg-discordDarkest'}`}
          >
            <div className="icon-pencil"></div> SKETCH
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {activeTab === 'notes' ? (
            <textarea 
              className="w-full h-full bg-discordDarkest text-gray-200 p-4 rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-mcPurple font-mono text-sm custom-scrollbar"
              placeholder="Jot down quick thoughts here..."
              defaultValue="- Gravity is acceleration&#10;- F = ma&#10;- For every action, equal opposite reaction"
            />
          ) : (
            <div className="w-full h-full flex flex-col">
              <div className="flex justify-end mb-2">
                <button onClick={clearCanvas} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white font-mono">
                  CLEAR
                </button>
              </div>
              <div className="flex-1 bg-white rounded-lg overflow-hidden border-2 border-gray-600">
                <canvas
                  ref={canvasRef}
                  width={250}
                  height={500}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Sidebar error:', error);
    return null;
  }
}