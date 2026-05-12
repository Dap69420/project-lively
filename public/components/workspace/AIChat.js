function AIChat() {
  try {
    // Simple markdown to React converter
    const renderMarkdown = (text) => {
      if (!text) return '';
      
      const parts = [];
      let lastIndex = 0;
      
      // Split by newlines first to preserve structure
      const lines = text.split('\n');
      
      return lines.map((line, lineIdx) => {
        let content = [];
        let index = 0;
        
        // Handle bold **text**
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let match;
        let lastBoldIndex = 0;
        
        const boldMatches = [];
        while ((match = boldRegex.exec(line)) !== null) {
          boldMatches.push({start: match.index, end: boldRegex.lastIndex, text: match[1]});
        }
        
        // Handle italics *text*
        const italicRegex = /\*([^*]+)\*/g;
        let lastItalicIndex = 0;
        const italicMatches = [];
        while ((match = italicRegex.exec(line)) !== null) {
          italicMatches.push({start: match.index, end: italicRegex.lastIndex, text: match[1]});
        }
        
        // Combine and sort all formatting matches
        const allMatches = [...boldMatches.map(m => ({...m, type: 'bold'})), 
                           ...italicMatches.map(m => ({...m, type: 'italic'}))].sort((a,b) => a.start - b.start);
        
        let result = [];
        let currentIndex = 0;
        
        allMatches.forEach(match => {
          if (match.start > currentIndex) {
            result.push(line.substring(currentIndex, match.start));
          }
          if (match.type === 'bold') {
            result.push(<strong key={lineIdx + '-' + match.start}>{match.text}</strong>);
          } else if (match.type === 'italic') {
            result.push(<em key={lineIdx + '-' + match.start}>{match.text}</em>);
          }
          currentIndex = match.end;
        });
        
        if (currentIndex < line.length) {
          result.push(line.substring(currentIndex));
        }
        
        if (result.length === 0) {
          result = [line];
        }
        
        return <div key={lineIdx} className="mb-1">{result}</div>;
      });
    };
    
    const progress = window.LivelyProgress.useProgress();
    const selectedCourseId = progress.selectedCourse;
    const selectedCourse = window.LivelyProgress.getSelectedCourse();
    
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
          const renderMarkdownWithMath = (text) => {
            if (!text) return '';
      
            const lines = text.split('\n');
      
            return lines.map((line, lineIdx) => {
              const parts = [];
              let currentIndex = 0;
        
              // Match display math $$...$$ and inline math \(...\)
              const mathRegex = /(\$\$[^\$]+\$\$|\\\\?\([^)]+\))/g;
              let match;
        
              while ((match = mathRegex.exec(line)) !== null) {
                const mathExpr = match[0];
                const start = match.index;
          
                // Add text before math
                if (start > currentIndex) {
                  const beforeText = line.substring(currentIndex, start);
                  parts.push(
                    <span key={`text-${lineIdx}-${currentIndex}`}>
                      {renderMarkdown(beforeText)}
                    </span>
                  );
                }
          
                // Add math element
                parts.push(
                  <span key={`math-${lineIdx}-${start}`} className="inline-block">
                    {mathExpr}
                  </span>
                );
          
                currentIndex = match.index + mathExpr.length;
              }
        
              // Add remaining text
              if (currentIndex < line.length) {
                const remainingText = line.substring(currentIndex);
                parts.push(
                  <span key={`text-${lineIdx}-${currentIndex}`}>
                    {renderMarkdown(remainingText)}
                  </span>
                );
              }
        
              if (parts.length === 0) {
                parts.push(renderMarkdown(line));
              }
        
              return <div key={lineIdx} className="mb-1">{parts}</div>;
            });
          };

          const progress = window.LivelyProgress.useProgress();
    const [isTyping, setIsTyping] = React.useState(false);
    const messagesEndRef = React.useRef(null);

    // Load messages from progression when course changes
    React.useEffect(() => {
      const savedMessages = window.LivelyProgress.getChatMessages(selectedCourseId);
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        // Show greeting only for new courses
        setMessages([
          { role: 'ai', text: `Hey! Ready to tackle ${selectedCourse.name}? Let's hear what you think.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
        ]);
      }
    }, [selectedCourseId, selectedCourse.name]);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
      scrollToBottom();
    }, [messages]);

      // Typewrite math after rendering
      React.useEffect(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().catch(err => console.log('MathJax error:', err));
        }
      }, [messages]);

    React.useEffect(() => {
      window.LivelyChat = {
        addAssistantMessage: (text) => {
          const msg = {
            role: 'ai',
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          };
          setMessages((prev) => {
            const updated = [...prev, msg];
            // Persist to progression
            window.LivelyProgress.addChatMessage({
              role: msg.role,
              text: msg.text,
              time: msg.time,
              courseId: selectedCourseId
            });
            return updated;
          });
        },
        addSystemMessage: (text) => {
          const msg = {
            role: 'ai',
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          };
          setMessages((prev) => {
            const updated = [...prev, msg];
            window.LivelyProgress.addChatMessage({
              role: msg.role,
              text: msg.text,
              time: msg.time,
              courseId: selectedCourseId
            });
            return updated;
          });
        }
      };
      return () => {
        if (window.LivelyChat) {
          delete window.LivelyChat;
        }
      };
    }, [selectedCourseId]);

    const handleSend = async () => {
      if (!input.trim() || isTyping) return;
      
      const userText = input;
      const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const userMsg = { role: 'user', text: userText, time: timeNow };
      const newMsgs = [...messages, userMsg];
      
      setMessages(newMsgs);
      // Persist user message
      window.LivelyProgress.addChatMessage({
        role: userMsg.role,
        text: userMsg.text,
        time: userMsg.time,
        courseId: selectedCourseId
      });
      
      setInput('');
      setIsTyping(true);
      
      try {
        const systemPrompt = `You are Buddy_AI, an encouraging study partner helping a student study ${selectedCourse.name}. Focus on these topics: ${selectedCourse.focus}. Be brief, use emojis, and don't give direct answers.`;

        let aiResponse = '';
        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userText })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'AI request failed');
          }

          aiResponse = data.text || '';
        } catch (apiError) {
          console.log('SambaNova call failed, using fallback.', apiError);
        }

        if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim() === '') {
          aiResponse = "That's a great thought! Inertia is all about objects wanting to keep doing what they're already doing. What do you think happens if you push a stationary rock? 🪨";
        }

        const isStruggling = userText.length < 15 || userText.toLowerCase().includes("don't know") || userText.toLowerCase().includes("stuck");
        setMood(isStruggling ? 'orange' : 'green');

        const countedAsCorrect = aiResponse && aiResponse !== "That's a great thought! Inertia is all about objects wanting to keep doing what they're already doing. What do you think happens if you push a stationary rock? 🪨";
        if (countedAsCorrect && window.LivelyProgress) {
          const xpReward = Math.max(10, Math.min(30, Math.floor(userText.length / 2)));
          const coinReward = Math.max(2, Math.floor(xpReward / 5));
          window.LivelyProgress.awardProgress({
            xp: xpReward,
            coins: coinReward,
            correct: true,
            courseId: selectedCourseId,
            source: 'ai'
          });
        }

        const aiMsg = { 
          role: 'ai', 
          text: aiResponse, 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
        };
        setMessages(prev => [...prev, aiMsg]);
        // Persist AI message
        window.LivelyProgress.addChatMessage({
          role: aiMsg.role,
          text: aiMsg.text,
          time: aiMsg.time,
          courseId: selectedCourseId
        });

        if (window.LivelyProgress) {
          window.LivelyProgress.setAlias(progress.alias || 'RECRUIT');
        }

      } catch (error) {
        console.error("AI Chat Error:", error);
        const errMsg = { 
          role: 'ai', 
          text: "Oops, my circuits glitched! Can you repeat that?", 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
        };
        setMessages(prev => [...prev, errMsg]);
        window.LivelyProgress.addChatMessage({
          role: errMsg.role,
          text: errMsg.text,
          time: errMsg.time,
          courseId: selectedCourseId
        });
      } finally {
        setIsTyping(false);
      }
    };

    return (
      <div className="panel flex-1 m-4 ml-0 flex flex-col" data-name="ai-chat" data-file="components/workspace/AIChat.js">
        
        {/* Chat Header */}
        <div className="bg-discordDarkest p-3 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-discordDark rounded-full border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                <div className="icon-bot text-2xl text-white"></div>
              </div>
              {/* Mood Orb */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-discordDarkest shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-colors duration-500
                ${mood === 'green' ? 'bg-mcGreen shadow-[0_0_10px_#55FF55]' : 'bg-mcOrange shadow-[0_0_10px_#FFAA00]'}`}>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-200">Buddy_AI</h3>
              <p className="text-xs font-mono text-gray-400">{window.LivelyProgress.getSelectedCourse().name} • Online & Listening</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded bg-discordDark hover:bg-gray-600 flex items-center justify-center text-gray-400">
              <div className="icon-volume-2 text-sm"></div>
            </button>
            <button className="w-8 h-8 rounded bg-discordDark hover:bg-gray-600 flex items-center justify-center text-gray-400">
              <div className="icon-more-vertical text-sm"></div>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#313338]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${msg.role === 'ai' ? 'bg-discordDark border-gray-600' : 'bg-mcPurple border-mcPurple'}`}>
                {msg.role === 'ai' ? <div className="icon-bot text-white"></div> : <div className="icon-user text-white"></div>}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-sm text-gray-300">{msg.role === 'ai' ? 'Buddy_AI' : 'You'}</span>
                  <span className="text-[10px] font-mono text-gray-500">{msg.time}</span>
                </div>
                <div className={`p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-mcPurple text-white rounded-tr-none' : 'bg-discordDarkest text-gray-200 rounded-tl-none border border-gray-700'}`}>
                  {msg.role === 'ai' ? renderMarkdownWithMath(msg.text) : msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* "Explain" Input Box */}
        <div className="p-4 bg-discordDarkest border-t border-gray-700/50">
          <div className="bg-discordDark border border-gray-600 rounded-lg p-2 focus-within:border-mcGreen transition-colors flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Hey, try explaining [The Laws of Motion] to me like I'm five..."
              className="w-full bg-transparent text-gray-200 font-sans text-sm resize-none outline-none p-2 min-h-[80px] custom-scrollbar"
            />
            <div className="flex justify-between items-center px-2 pb-1">
              <span className="text-xs font-mono text-gray-500">Press ENTER to send</span>
              <button 
                onClick={handleSend}
                className="bg-mcGreen text-black font-bold font-pixel px-4 py-1.5 rounded hover:bg-[#44ee44] active:scale-95 transition-all flex items-center gap-2"
              >
                SEND <div className="icon-send text-sm"></div>
              </button>
            </div>
          </div>
        </div>
        
      </div>
    );
  } catch (error) {
    console.error('AIChat error:', error);
    return null;
  }
}