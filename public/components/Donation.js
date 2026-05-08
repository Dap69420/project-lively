function Donation() {
  try {
    return (
      <section id="donate" className="w-full max-w-6xl mx-auto px-6 py-20 flex justify-center" data-name="donation" data-file="components/Donation.js">
        
        <div className="w-full max-w-2xl bg-lime text-black border-8 border-white p-8 md:p-12 shadow-[16px_16px_0px_#ff00ff] relative overflow-hidden">
          
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #111 25%, #111 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-black text-lime px-3 py-1 font-mono text-sm font-bold border-2 border-white mb-4">
                <div className="icon-battery-charging"></div> SUPPORT US
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 tracking-tighter">Fuel the Lab</h2>
              <p className="font-mono text-black font-bold text-lg leading-tight mb-6">
                Doing this solo and from scratch. Support the tokens, support the mission.
              </p>
              
              <button className="brutal-btn-pink w-full md:w-auto">
                COPY UPI ID
              </button>
            </div>

            <div className="w-48 h-48 bg-white border-4 border-black p-2 shadow-[8px_8px_0px_#000] shrink-0 rotate-3 flex flex-col items-center justify-center">
              {/* QR Code Placeholder */}
              <div className="w-full h-full border-4 border-dashed border-gray-400 flex flex-col items-center justify-center bg-gray-100">
                <div className="icon-qr-code text-5xl text-gray-400 mb-2"></div>
                <span className="font-mono text-xs text-gray-500 font-bold text-center px-2">SCAN TO FUND</span>
              </div>
            </div>

          </div>
        </div>

      </section>
    );
  } catch (error) {
    console.error('Donation component error:', error);
    return null;
  }
}