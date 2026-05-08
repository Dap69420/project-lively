function SupportCard() {
  try {
    return (
      <div className="w-full bg-black text-white border-8 border-white p-8 md:p-12 shadow-[16px_16px_0px_#ccff00] relative overflow-hidden" data-name="support-card" data-file="components/founders/SupportCard.js">
        
        {/* Background diagonal lines */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ccff00 0px, #ccff00 2px, transparent 2px, transparent 20px)' }}></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 tracking-tighter">Keep the Lab Running</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 bg-white/5 p-3 border border-white/20">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded">
                  <div className="icon-server"></div>
                </div>
                <div className="font-mono">
                  <div className="text-sm font-bold">Server Costs</div>
                  <div className="text-xs text-gray-400">Keeping the database spinning 24/7.</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-3 border border-white/20">
                <div className="p-2 bg-hotpink/20 text-hotpink rounded">
                  <div className="icon-cpu"></div>
                </div>
                <div className="font-mono">
                  <div className="text-sm font-bold">API Tokens</div>
                  <div className="text-xs text-gray-400">Fueling the AI models that make it smart.</div>
                </div>
              </div>
            </div>

            <a href="#" className="brutal-btn-lime inline-flex items-center gap-2">
              <div className="icon-coffee"></div> Buy me a Coffee
            </a>
          </div>

          <div className="w-56 h-56 bg-white border-4 border-black p-3 shadow-[8px_8px_0px_#ff00ff] shrink-0 transform rotate-2">
            <div className="w-full h-full border-4 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50">
              <div className="icon-qr-code text-6xl text-gray-400 mb-2"></div>
              <span className="font-mono text-xs text-gray-500 font-bold text-center px-2 uppercase">UPI QR Placeholder</span>
            </div>
          </div>

        </div>
      </div>
    );
  } catch (error) {
    console.error('SupportCard component error:', error);
    return null;
  }
}