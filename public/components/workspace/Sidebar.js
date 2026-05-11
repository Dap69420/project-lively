function Sidebar() {
  try {
    const [activeTab, setActiveTab] = React.useState('notes');

    return (
      <div className="w-72 bg-discordDarker border-r border-black/20 flex flex-col h-full" data-name="sidebar" data-file="components/workspace/Sidebar.js">
        <div className="p-4 flex gap-2 border-b border-black/20">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 rounded-md font-mono text-xs flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-discordDark text-white' : 'text-gray-400 hover:bg-discordDarkest'}`}
          >
            <div className="icon-file-text"></div> NOTES
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <textarea 
            className="w-full h-full bg-discordDarkest text-gray-200 p-4 rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-mcPurple font-mono text-sm custom-scrollbar"
            placeholder="Jot down quick thoughts here..."
            defaultValue="- Gravity is acceleration&#10;- F = ma&#10;- For every action, equal opposite reaction"
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Sidebar error:', error);
    return null;
  }
}