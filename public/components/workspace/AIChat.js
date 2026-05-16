function AIChat() {
  try {
    const sanitizeAssistantText = (text) => {
      if (!text) return '';

      return text
        .replace(/```[\s\S]*?```/g, '')
        .split('\n')
        .filter((line) => !/^(thinking|reasoning|analysis|chain of thought|internal note|step-by-step)\b[:\-]?/i.test(line.trim()))
        .join('\n')
        .trim();
    };

    const renderInline = (text) => {
      if (!text) return null;

      const tokens = [];
      const inlineRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\\\((.+?)\\\)|\$\$([\s\S]+?)\$\$)/g;
      let lastIndex = 0;
      let match;

      while ((match = inlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          tokens.push(text.slice(lastIndex, match.index));
        }

        if (match[2]) {
          tokens.push(<strong key={`${match.index}-b`}>{match[2]}</strong>);
        } else if (match[3]) {
          tokens.push(<em key={`${match.index}-i`}>{match[3]}</em>);
        } else if (match[4] || match[5]) {
          tokens.push(
            <span key={`${match.index}-m`} className="inline-block align-baseline whitespace-pre-wrap">
              {match[0]}
            </span>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        tokens.push(text.slice(lastIndex));
      }

      return tokens.length ? tokens : text;
    };

    const renderFormattedMessage = (text) => {
      if (!text) return null;

      const lines = text.split('\n');
      const rendered = [];
      let displayMathLines = [];
      let inDisplayMath = false;

      const flushDisplayMath = (key) => {
        if (!displayMathLines.length) return;
        rendered.push(
          <div key={key} className="my-2 overflow-x-auto rounded bg-black/20 px-3 py-2 border border-gray-700">
            <span className="block whitespace-pre-wrap text-center">{`\\[
${displayMathLines.join('\n')}
\\]`}</span>
          </div>
        );
        displayMathLines = [];
      };

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        if (trimmed === '\\[' || trimmed === '$$') {
          inDisplayMath = true;
          displayMathLines = [];
          return;
        }

        if (inDisplayMath && (trimmed === '\\]' || trimmed === '$$')) {
          flushDisplayMath(`math-${lineIdx}`);
          inDisplayMath = false;
          return;
        }

        if (inDisplayMath) {
          displayMathLines.push(line);
          return;
        }

        if (!trimmed) {
          rendered.push(<div key={lineIdx} className="h-2" />);
          return;
        }

        if (trimmed === '---') {
          rendered.push(<hr key={lineIdx} className="my-2 border-gray-600" />);
          return;
        }

        const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const HeadingTag = `h${Math.min(level + 2, 5)}`;
          rendered.push(
            <HeadingTag key={lineIdx} className="font-bold text-gray-100 mb-1">
              {renderInline(headingMatch[2])}
            </HeadingTag>
          );
          return;
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          rendered.push(
            <div key={lineIdx} className="flex gap-2 mb-1">
              <span className="text-mcGreen shrink-0">•</span>
              <div>{renderInline(bulletMatch[1])}</div>
            </div>
          );
          return;
        }

        const numberedMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
        if (numberedMatch) {
          rendered.push(
            <div key={lineIdx} className="flex gap-2 mb-1">
              <span className="text-mcGreen shrink-0 font-semibold">{trimmed.match(/^\d+/)?.[0]}.</span>
              <div>{renderInline(numberedMatch[1])}</div>
            </div>
          );
          return;
        }

        rendered.push(<div key={lineIdx} className="mb-1">{renderInline(line)}</div>);
      });

      if (inDisplayMath) {
        flushDisplayMath(`math-end-${lines.length}`);
      }

      return rendered;
    };

    const progress = window.LivelyProgress.useProgress();
    const selectedCourseId = progress.selectedCourse;
    const selectedCourse = window.LivelyProgress.getSelectedCourse();
    const selectedCourseState = progress.courseProgress?.[selectedCourseId] || { questions: 0, completed: false };
    const adminEmails = Array.isArray(window.__APP_CONFIG__?.ADMIN_ALLOWED_EMAILS) ? window.__APP_CONFIG__.ADMIN_ALLOWED_EMAILS : [];
    const isAdminViewer = adminEmails.some((email) => String(email).toLowerCase() === String(progress.userEmail || '').toLowerCase());
    const courseContext = {
      id: selectedCourse.id,
      title: selectedCourse.name,
      subject: selectedCourse.subject,
      grade: selectedCourse.grade,
      topic: selectedCourse.focus,
      aiAim: selectedCourse.aiAim,
      objectives: Array.isArray(selectedCourse.objectives) ? selectedCourse.objectives : [],
      cardStyle: selectedCourse.cardStyle || {},
      completed: Boolean(selectedCourseState.completed),
      attemptCount: Number(selectedCourseState.questions || 0)
    };
    
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [mood, setMood] = React.useState('green');
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
        addAssistantMessage: (text, metadata = {}) => {
          const msg = {
            role: 'ai',
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            metadata
          };
          setMessages((prev) => {
            const updated = [...prev, msg];
            // Persist to progression
            window.LivelyProgress.addChatMessage({
              role: msg.role,
              text: msg.text,
              time: msg.time,
              courseId: selectedCourseId,
              metadata: msg.metadata
            });
            return updated;
          });
        },
        addSystemMessage: (text, metadata = {}) => {
          const msg = {
            role: 'ai',
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            metadata
          };
          setMessages((prev) => {
            const updated = [...prev, msg];
            window.LivelyProgress.addChatMessage({
              role: msg.role,
              text: msg.text,
              time: msg.time,
              courseId: selectedCourseId,
              metadata: msg.metadata
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
      const normalizeForComparison = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
      const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
      const repeatedInput = Boolean(lastUserMessage) && normalizeForComparison(lastUserMessage.text) !== '' && normalizeForComparison(lastUserMessage.text) === normalizeForComparison(userText);
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
        const runtimeCourseContext = Object.assign({}, courseContext, {
          repeatedInput,
          attemptCount: Number(selectedCourseState.questions || 0) + 1
        });

        const systemPrompt = `You are Buddy_AI, an encouraging study partner helping a student study ${selectedCourse.name}. Focus only on the current course topic: ${selectedCourse.focus}. The current course objectives are: ${(courseContext.objectives || []).join(' | ') || 'none listed'}. Use the objectives to guide the student, and decide whether the response should award XP, reduce XP, or complete the course. If the student repeats the same answer, do not mark completion unless new evidence appears.`;

        let aiResponse = '';
        let aiDecision = null;
        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userText, courseContext: runtimeCourseContext, mode: 'chat' })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'AI request failed');
          }

          aiResponse = data.text || '';
          aiDecision = data.decision || null;
        } catch (apiError) {
          console.log('SambaNova call failed, using fallback.', apiError);
        }

        aiResponse = sanitizeAssistantText(aiResponse);

        if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim() === '') {
          aiResponse = "That's a great thought! Inertia is all about objects wanting to keep doing what they're already doing. What do you think happens if you push a stationary rock? 🪨";
        }

        const isStruggling = userText.length < 15 || userText.toLowerCase().includes("don't know") || userText.toLowerCase().includes("stuck");
        setMood(isStruggling ? 'orange' : 'green');

        if (window.LivelyProgress) {
          const xpReward = Number(aiDecision?.xp_delta ?? (aiResponse ? Math.max(10, Math.min(30, Math.floor(userText.length / 2))) : 0));
          const coinReward = Number(aiDecision?.coins_delta ?? (xpReward > 0 ? Math.max(2, Math.floor(xpReward / 5)) : 0));
          window.LivelyProgress.awardProgress({
            xp: xpReward,
            coins: coinReward,
            correct: xpReward > 0,
            courseId: selectedCourseId,
            source: 'ai',
            decision: aiDecision
          });

          const completionThreshold = Math.max(2, (courseContext.objectives || []).length || 0);
          const canComplete = aiDecision?.completed && !selectedCourseState.completed && runtimeCourseContext.attemptCount >= completionThreshold;
          if (canComplete) {
            window.LivelyProgress.completeCourse(selectedCourseId).catch((error) => {
              console.error('Course completion sync error:', error);
            });
          }
        }

        const aiMsg = { 
          role: 'ai', 
          text: sanitizeAssistantText(aiResponse), 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          metadata: { aiDecision }
        };
        setMessages(prev => [...prev, aiMsg]);
        // Persist AI message
        window.LivelyProgress.addChatMessage({
          role: aiMsg.role,
          text: aiMsg.text,
          time: aiMsg.time,
          courseId: selectedCourseId,
          metadata: aiMsg.metadata
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
                  {msg.role === 'ai' ? renderFormattedMessage(msg.text) : msg.text}
                </div>
                {msg.role === 'ai' && isAdminViewer && msg.metadata?.aiDecision?.internal_response ? (
                  <div className="mt-2 rounded border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-[11px] leading-relaxed text-yellow-100">
                    <div className="mb-1 font-mono uppercase tracking-[0.2em] text-yellow-300">Admin only</div>
                    <div>{msg.metadata.aiDecision.internal_response}</div>
                    {msg.metadata.aiDecision.completion_reason ? (
                      <div className="mt-1 text-yellow-200/80">{msg.metadata.aiDecision.completion_reason}</div>
                    ) : null}
                  </div>
                ) : null}
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
              placeholder={`Hey, try explaining [${selectedCourse.name || 'this topic'}] to me like I'm five...`}
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