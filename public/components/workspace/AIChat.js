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
      const inlineRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\\\((.+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$)/g;
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
        } else if (match[4] || match[5] || match[6]) {
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
    const isCourseCompleted = Boolean(selectedCourseState.completed);
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
      objectiveStatus: Array.isArray(selectedCourseState.objectiveStatus) ? selectedCourseState.objectiveStatus : [],
      cardStyle: selectedCourse.cardStyle || {},
      aiSettings: selectedCourse.aiSettings || {},
      completed: Boolean(selectedCourseState.completed),
      attemptCount: Number(selectedCourseState.questions || 0)
    };

    const getCurrentObjectiveInfo = () => {
      const state = window.LivelyProgress.getState();
      const liveCourseState = state.courseProgress?.[selectedCourseId] || selectedCourseState || {};
      const objectives = Array.isArray(selectedCourse.objectives) ? selectedCourse.objectives : [];
      const objectiveStatus = Array.isArray(liveCourseState.objectiveStatus) ? liveCourseState.objectiveStatus : [];
      const index = objectives.findIndex((_objective, objectiveIndex) => !objectiveStatus[objectiveIndex]);
      return {
        index,
        objective: index >= 0 ? objectives[index] : '',
        objectives,
        allComplete: objectives.length > 0 && index < 0
      };
    };

    const buildObjectiveHint = (kind = 'hint') => {
      const info = getCurrentObjectiveInfo();
      if (info.allComplete) {
        return 'All checkpoints are cleared. Take the final test in chat: answer all 10 questions and score at least 4/10 to complete the course.';
      }

      const objective = info.objective || selectedCourse.focus || selectedCourse.name;
      const topic = selectedCourse.focus || selectedCourse.name;
      const lowerObjective = objective.toLowerCase();

      let expected = `Use this shape: define the idea in your own words, add one concrete example from ${topic}, then explain why the example proves your point.`;
      if (/\bsolve|problem|calculation|formula|word problem\b/.test(lowerObjective)) {
        expected = 'Write the given values, choose the formula, substitute numbers, calculate the answer, and add the unit plus one sentence explaining the result.';
      } else if (/\b(provided|given)\s+by\s+(buddy|buddy_ai|ai)\b/.test(lowerObjective)) {
        if (/\bneutralization|reactants|products|acid|base|salt|water\b/.test(lowerObjective)) {
          expected = 'Use Buddy_AI reaction: hydrochloric acid + sodium hydroxide -> sodium chloride + water. Identify HCl and NaOH as reactants, NaCl and water as products, then explain that acid + base makes salt + water.';
        } else {
          expected = 'Ask Buddy_AI for the example first, then identify its important parts and explain why each part fits the objective.';
        }
      } else if (/\b3 laws|three laws|newton|first law|second law|third law|laws of motion\b/.test(lowerObjective)) {
        expected = 'Cover the missing Newton laws one by one: name the law, explain it simply, then give a daily-life example for that law.';
      } else if (/\bdifferentiate|compare|contrast|difference\b/.test(lowerObjective)) {
        expected = `State both sides clearly, give one concrete ${topic} example for each side, and add one sentence explaining how the examples are different.`;
      } else if (/\bexplain|meaning|define\b/.test(lowerObjective)) {
        expected = `Explain ${objective} in your own words, then give one specific example and one because/so sentence that connects the example back to the idea.`;
      }

      return kind === 'next'
        ? `Next checkpoint: ${objective}. ${expected}`
        : `Hint for checkpoint ${info.index + 1}: ${objective}. ${expected}`;
    };

    const getCoveredConcepts = (messageList) => {
      const text = (messageList || [])
        .filter((msg) => msg.role === 'user')
        .map((msg) => msg.text)
        .join('\n')
        .toLowerCase();
      const concepts = [];

      if (/\b(first law|1st law|inertia|law of inertia)\b/.test(text)) concepts.push('Newton first law / inertia');
      if (/\b(second law|2nd law|f\s*=\s*m\s*a|f=ma|force equals mass|force\s+is\s+mass)\b/.test(text)) concepts.push('Newton second law / F = ma');
      if (/\b(third law|3rd law|action reaction|equal and opposite)\b/.test(text)) concepts.push('Newton third law / action-reaction');
      if (/\bmotion\b/.test(text)) concepts.push('motion');
      if (/\bvelocity|speed\b/.test(text)) concepts.push('speed or velocity');
      if (/\bacceleration\b/.test(text)) concepts.push('acceleration');

      return Array.from(new Set(concepts));
    };
    
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [mood, setMood] = React.useState('green');
    const [answeredQuizKeys, setAnsweredQuizKeys] = React.useState([]);
    const [activeQuizPrompt, setActiveQuizPrompt] = React.useState(null);
    const [activeFinalTest, setActiveFinalTest] = React.useState(null);
    const [finalTestLoading, setFinalTestLoading] = React.useState(false);
    const [courseCompletionPending, setCourseCompletionPending] = React.useState(false);
    const [pendingHintConfirm, setPendingHintConfirm] = React.useState(false);
    const [pendingFinalQuizKey, setPendingFinalQuizKey] = React.useState('');
    const moodConfig = {
      green: { label: 'Focused', tone: 'bg-mcGreen shadow-[0_0_10px_#55FF55]', text: 'text-mcGreen' },
      supportive: { label: 'Supportive', tone: 'bg-mcOrange shadow-[0_0_10px_#FFAA00]', text: 'text-mcOrange' },
      focused: { label: 'Focused', tone: 'bg-mcGreen shadow-[0_0_10px_#55FF55]', text: 'text-mcGreen' },
      excited: { label: 'Excited', tone: 'bg-lime shadow-[0_0_12px_#ccff00]', text: 'text-lime' },
      curious: { label: 'Quiz Mode', tone: 'bg-blue-400 shadow-[0_0_12px_#60a5fa]', text: 'text-blue-400' },
      strict: { label: 'Careful', tone: 'bg-red-400 shadow-[0_0_12px_#f87171]', text: 'text-red-400' },
      orange: { label: 'Supportive', tone: 'bg-mcOrange shadow-[0_0_10px_#FFAA00]', text: 'text-mcOrange' }
    };
    const currentMood = moodConfig[mood] || moodConfig.focused;
    const [isTyping, setIsTyping] = React.useState(false);
    const messagesEndRef = React.useRef(null);
    const finalTestStartingRef = React.useRef(false);
    const pendingFinalQuizKeyRef = React.useRef('');
    const hydrateQuizAnswers = (messageList) => {
      const answersByKey = {};
      (messageList || []).forEach((message, index) => {
        if (message.metadata?.type === 'quiz_answer') {
          const fallbackQuizKey = message.metadata.quizIndex != null ? `${selectedCourseId}-${message.metadata.quizIndex}` : '';
          const quizKey = message.metadata.quizKey || fallbackQuizKey;
          if (quizKey) {
            answersByKey[quizKey] = message.metadata;
          }
        }
      });

      return (messageList || []).map((message, index) => {
        if (message.metadata?.type !== 'quiz' || !message.metadata?.quiz) {
          return message;
        }

        const quizKey = message.metadata.quizKey || `${selectedCourseId}-${index}`;
        const answer = answersByKey[quizKey];
        if (!answer) {
          return Object.assign({}, message, {
            metadata: Object.assign({}, message.metadata, { quizKey })
          });
        }

        return Object.assign({}, message, {
          metadata: Object.assign({}, message.metadata, {
            quizKey,
            selectedIndex: answer.selectedIndex,
            correctIndex: answer.correctIndex,
            isCorrect: answer.isCorrect
          })
        });
      });
    };
    const getAnsweredQuizKeys = (messageList) => Array.from(new Set(
      (messageList || [])
        .filter((message) => message.metadata?.type === 'quiz_answer' && message.metadata?.quizKey)
        .map((message) => message.metadata.quizKey)
    ));

    // Load messages from progression when course changes
    React.useEffect(() => {
      setAnsweredQuizKeys([]);
      setActiveQuizPrompt(null);
      const draft = progress.courseProgress?.[selectedCourseId]?.stats?.finalTest?.draft;
      setActiveFinalTest(draft && Array.isArray(draft.questions) && draft.questions.length ? Object.assign({}, draft, {
        passScore: Number(draft.passScore || draft.pass_score || 4),
        answers: Array.isArray(draft.answers) ? draft.answers : Array(10).fill(null)
      }) : null);
      setCourseCompletionPending(false);
      setPendingHintConfirm(false);
      setPendingFinalQuizKey('');
      pendingFinalQuizKeyRef.current = '';
      let cancelled = false;
      const completedMessage = {
        role: 'ai',
        text: `Course completed: ${selectedCourse.name}. You can reopen this course anytime to review your chat and sketch, but new work is locked for this completed path.`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        metadata: { type: 'course_completed' }
      };

      const loadMessages = async () => {
        const savedMessages = window.LivelyProgress.getChatMessages(selectedCourseId);
        if (savedMessages && savedMessages.length > 0) {
          if (!cancelled) {
            const visibleMessages = hydrateQuizAnswers(savedMessages);
            const hasCompletionMessage = visibleMessages.some((message) => message.metadata?.type === 'course_completed');
            const nextMessages = isCourseCompleted && !hasCompletionMessage ? [...visibleMessages, completedMessage] : visibleMessages;
            setAnsweredQuizKeys(getAnsweredQuizKeys(nextMessages));
            setMessages(nextMessages);
          }
          return;
        }

        try {
          const hydratedMessages = await window.LivelyProgress.loadChatHistory(selectedCourseId);
          if (cancelled) return;

          if (hydratedMessages && hydratedMessages.length > 0) {
            const visibleMessages = hydrateQuizAnswers(hydratedMessages);
            const hasCompletionMessage = visibleMessages.some((message) => message.metadata?.type === 'course_completed');
            const nextMessages = isCourseCompleted && !hasCompletionMessage ? [...visibleMessages, completedMessage] : visibleMessages;
            setAnsweredQuizKeys(getAnsweredQuizKeys(nextMessages));
            setMessages(nextMessages);
          } else {
            setMessages([
              isCourseCompleted ? completedMessage : { role: 'ai', text: `Hey! Ready to tackle ${selectedCourse.name}? Let's hear what you think.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
            ]);
          }
        } catch (_error) {
          if (cancelled) return;
          setMessages([
            isCourseCompleted ? completedMessage : { role: 'ai', text: `Hey! Ready to tackle ${selectedCourse.name}? Let's hear what you think.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
          ]);
        }
      };

      loadMessages();

      return () => {
        cancelled = true;
      };
    }, [selectedCourseId, selectedCourse.name, isCourseCompleted]);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
      scrollToBottom();
    }, [messages]);

    React.useEffect(() => {
      if (activeFinalTest || isCourseCompleted) return;
      const draft = selectedCourseState.stats?.finalTest?.draft;
      if (draft && Array.isArray(draft.questions) && draft.questions.length) {
        setActiveFinalTest(Object.assign({}, draft, {
          passScore: Number(draft.passScore || draft.pass_score || 4),
          answers: Array.isArray(draft.answers) ? draft.answers : Array(10).fill(null)
        }));
      }
    }, [selectedCourseId, selectedCourseState.stats?.finalTest?.draft, activeFinalTest, isCourseCompleted]);

      // Typewrite math after rendering
      React.useEffect(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().catch(err => console.log('MathJax error:', err));
        }
      }, [messages]);

    React.useEffect(() => {
      window.LivelyChat = {
        addUserSketch: (imageUrl, metadata = {}) => {
          const msg = {
            role: 'user',
            text: 'Sketch submitted',
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            metadata: Object.assign({}, metadata, { type: 'sketch', imageUrl })
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
        },
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

    const handleQuizAnswer = (quiz, selectedIndex, quizKey) => {
      const isActivePromptAnswer = Boolean(activeQuizPrompt?.quizKey && activeQuizPrompt.quizKey === quizKey);
      if (!quiz || (isCourseCompleted && !isActivePromptAnswer) || answeredQuizKeys.includes(quizKey)) return;
      setAnsweredQuizKeys((current) => current.includes(quizKey) ? current : [...current, quizKey]);
      setActiveQuizPrompt((current) => current?.quizKey === quizKey ? null : current);
      const correctIndex = Number(quiz.correct_index ?? quiz.correctIndex ?? 0);
      const isCorrect = selectedIndex === correctIndex;
      const selectedAnswer = quiz.options?.[selectedIndex] || `Option ${selectedIndex + 1}`;
      const correctAnswer = quiz.options?.[correctIndex] || 'the correct option';
      const nextHint = buildObjectiveHint('next').replace(/^Next checkpoint:\s*/i, 'Next up: ');
      const feedbackText = isCorrect
        ? `Boom, correct. ${quiz.explanation || `You picked ${correctAnswer}, and that fits the idea we are practicing.`}\n\n${nextHint}`
        : `Close, but not this one. You picked: ${selectedAnswer}. The right answer is: ${correctAnswer}.\n\n${quiz.explanation || 'The key is to apply the idea, not just name it.'}\n\n${nextHint}`;
      const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const answerMsg = {
        role: 'user',
        text: `Quiz answer: ${selectedAnswer}`,
        time: timeNow,
        metadata: { type: 'quiz_answer', quizKey, selectedIndex, correctIndex, isCorrect }
      };
      const feedbackMsg = {
        role: 'ai',
        text: feedbackText,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        metadata: { type: 'quiz_feedback', quizKey, selectedIndex, correctIndex, isCorrect }
      };

      setMessages((prev) => [
        ...prev.map((message, index) => {
          if (message.metadata?.type !== 'quiz' || !message.metadata?.quiz) {
            return message;
          }

          const messageQuizKey = message.metadata.quizKey || `${selectedCourseId}-${index}`;
          if (messageQuizKey !== quizKey) {
            return message;
          }

          return Object.assign({}, message, {
            metadata: Object.assign({}, message.metadata, {
              quizKey,
              selectedIndex,
              correctIndex,
              isCorrect
            })
          });
        }),
        answerMsg,
        feedbackMsg
      ]);
      window.LivelyProgress.addChatMessage({
        role: answerMsg.role,
        text: answerMsg.text,
        time: answerMsg.time,
        courseId: selectedCourseId,
        metadata: answerMsg.metadata
      });
      window.LivelyProgress.addChatMessage({
        role: feedbackMsg.role,
        text: feedbackMsg.text,
        time: feedbackMsg.time,
        courseId: selectedCourseId,
        metadata: feedbackMsg.metadata
      });
      window.LivelyProgress.awardProgress({
        xp: isCorrect ? 8 : 2,
        coins: isCorrect ? 2 : 0,
        correct: isCorrect,
        courseId: selectedCourseId,
        source: 'quiz'
      });
      window.dispatchEvent(new CustomEvent('livelyPlaySfx', { detail: { type: isCorrect ? 'success' : 'error' } }));
      setMood(isCorrect ? 'excited' : 'supportive');
      if (pendingFinalQuizKey && pendingFinalQuizKey === quizKey) {
        setPendingFinalQuizKey('');
        pendingFinalQuizKeyRef.current = '';
        const liveState = window.LivelyProgress.getState().courseProgress?.[selectedCourseId] || {};
        const objectives = Array.isArray(selectedCourse.objectives) ? selectedCourse.objectives : [];
        const objectiveStatus = Array.isArray(liveState.objectiveStatus) ? liveState.objectiveStatus : [];
        const allObjectivesCleared = objectives.length > 0 && objectives.every((_objective, index) => Boolean(objectiveStatus[index]));
        if (allObjectivesCleared && !liveState.completed && !liveState.stats?.finalTest?.passed) {
          startFinalTest(`Quiz done. Final test time: answer 10 questions. You need at least 4/10 to complete ${selectedCourse.name}.`);
        }
      }
    };

    const handleHintRequest = () => {
      if (isCourseCompleted) return;
      setPendingHintConfirm(true);
    };

    const confirmHintRequest = async () => {
      setPendingHintConfirm(false);
      const cost = 5;
      const spendResult = typeof window.LivelyProgress.spendCoins === 'function'
        ? window.LivelyProgress.spendCoins(cost, 'chat_hint')
        : { success: Number(progress.coins || 0) >= cost };
      let text = `You need ${cost} coins for a hint. Try answering a quiz or explaining one idea to earn more.`;

      if (spendResult.success) {
        text = `${buildObjectiveHint('hint')}\n\nHint cost: ${cost} coins.`;
        try {
          const recentStudentEvidence = messages
            .filter((msg) => msg.role === 'user')
            .slice(-8)
            .map((msg) => msg.text)
            .filter(Boolean);
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'hint',
              userText: 'Give me a hint for the current checkpoint.',
              courseContext: Object.assign({}, courseContext, {
                recentStudentEvidence,
                cumulativeStudentEvidence: recentStudentEvidence.join('\n\n')
              })
            })
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.text) {
            text = `${sanitizeAssistantText(data.text)}\n\nHint cost: ${cost} coins.`;
          }
        } catch (error) {
          console.error('Hint request failed:', error);
        }
      }

      const msg = {
        role: 'ai',
        text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        metadata: { type: 'hint', cost: spendResult.success ? cost : 0 }
      };
      setMessages((prev) => [...prev, msg]);
      window.LivelyProgress.addChatMessage({
        role: msg.role,
        text: msg.text,
        time: msg.time,
        courseId: selectedCourseId,
        metadata: msg.metadata
      });
      setMood(spendResult.success ? 'curious' : 'supportive');
    };

    const startFinalTest = async (reasonText = '', options = {}) => {
      if (finalTestStartingRef.current || finalTestLoading || isCourseCompleted || (activeFinalTest && !options.force)) return;
      finalTestStartingRef.current = true;
      setFinalTestLoading(true);

      try {
        const currentCourseState = window.LivelyProgress.getState().courseProgress?.[selectedCourseId] || {};
        const attempt = Number(currentCourseState.stats?.finalTest?.attempts || 0) + 1;
        const response = await fetch('/api/ai/final-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseContext, attempt })
        });
        const payload = await response.json().catch(() => ({}));
        const test = payload?.test;

        if (!response.ok || !test || !Array.isArray(test.questions)) {
          throw new Error(payload?.error || 'Unable to build final test');
        }

        const normalizedTest = {
          title: test.title || `${selectedCourse.name} Final Test`,
          passScore: Number(test.pass_score || test.passScore || 4),
          questions: test.questions.slice(0, 10),
          answers: Array(10).fill(null),
          attempt
        };
        setActiveFinalTest(normalizedTest);
        if (typeof window.LivelyProgress.saveFinalTestDraft === 'function') {
          window.LivelyProgress.saveFinalTestDraft(selectedCourseId, normalizedTest);
        }

        const msg = {
          role: 'ai',
          text: reasonText || `All objectives are cleared. Final test time: answer 10 questions. You need at least ${normalizedTest.passScore}/10 to complete the course.`,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          metadata: { type: 'final_test_started', attempt, passScore: normalizedTest.passScore }
        };
        setMessages((prev) => [...prev, msg]);
        window.LivelyProgress.addChatMessage({
          role: msg.role,
          text: msg.text,
          time: msg.time,
          courseId: selectedCourseId,
          metadata: msg.metadata
        });
      } catch (error) {
        const msg = {
          role: 'ai',
          text: 'All objectives are cleared, but I could not build the final test yet. Try sending one more message and I will retry.',
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          metadata: { type: 'final_test_error', error: error?.message || String(error) }
        };
        setMessages((prev) => [...prev, msg]);
      } finally {
        finalTestStartingRef.current = false;
        setFinalTestLoading(false);
      }
    };

    const handleFinalTestAnswer = (questionIndex, selectedIndex) => {
      setActiveFinalTest((current) => {
        if (!current) return current;
        const answers = current.answers.slice();
        answers[questionIndex] = selectedIndex;
        const next = Object.assign({}, current, { answers });
        if (typeof window.LivelyProgress.saveFinalTestDraft === 'function') {
          window.LivelyProgress.saveFinalTestDraft(selectedCourseId, next);
        }
        return next;
      });
    };

    const submitFinalTest = async () => {
      if (!activeFinalTest || activeFinalTest.answers.some((answer) => answer === null)) return;

      const questions = activeFinalTest.questions || [];
      const score = questions.reduce((total, question, index) => {
        const correctIndex = Number(question.correct_index ?? question.correctIndex ?? 0);
        return total + (activeFinalTest.answers[index] === correctIndex ? 1 : 0);
      }, 0);
      const passScore = Number(activeFinalTest.passScore || 4);
      const passed = score >= passScore;
      const summaryLines = questions.map((question, index) => {
        const selectedIndex = activeFinalTest.answers[index];
        const correctIndex = Number(question.correct_index ?? question.correctIndex ?? 0);
        return `${index + 1}. Your answer: ${question.options?.[selectedIndex] || 'No answer'} | Correct: ${question.options?.[correctIndex] || 'Unknown'}`;
      });
      const resultText = passed
        ? `Final test passed: ${score}/10. Course completed.`
        : `Final test failed: ${score}/10. You need ${passScore}/10, so I made a note and you need another test.`;
      const resultMsg = {
        role: 'ai',
        text: `${resultText}\n\n${summaryLines.join('\n')}`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        metadata: {
          type: 'final_test_result',
          score,
          totalQuestions: questions.length,
          passScore,
          passed,
          attempt: activeFinalTest.attempt,
          answers: activeFinalTest.answers
        }
      };

      setMessages((prev) => [...prev, resultMsg]);
      window.LivelyProgress.addChatMessage({
        role: resultMsg.role,
        text: resultMsg.text,
        time: resultMsg.time,
        courseId: selectedCourseId,
        metadata: resultMsg.metadata
      });
      await window.LivelyProgress.recordFinalTestResult(selectedCourseId, {
        score,
        totalQuestions: questions.length,
        passScore,
        passed
      });

      if (passed) {
        window.dispatchEvent(new CustomEvent('livelyPlaySfx', { detail: { type: 'success' } }));
        setCourseCompletionPending(true);
        setActiveFinalTest(null);
        if (typeof window.LivelyProgress.clearFinalTestDraft === 'function') {
          window.LivelyProgress.clearFinalTestDraft(selectedCourseId);
        }
        await window.LivelyProgress.completeCourse(selectedCourseId);
        const completionMsg = {
          role: 'ai',
          text: `Course completed: ${selectedCourse.name}. You passed the final test, so this course is now locked as completed. You can reopen it anytime for review.`,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          metadata: { type: 'course_completed' }
        };
        setMessages((prev) => [...prev, completionMsg]);
        window.LivelyProgress.addChatMessage({
          role: completionMsg.role,
          text: completionMsg.text,
          time: completionMsg.time,
          courseId: selectedCourseId,
          metadata: completionMsg.metadata
        });
      } else {
        window.dispatchEvent(new CustomEvent('livelyPlaySfx', { detail: { type: 'error' } }));
        setActiveFinalTest(null);
        if (typeof window.LivelyProgress.clearFinalTestDraft === 'function') {
          window.LivelyProgress.clearFinalTestDraft(selectedCourseId);
        }
        startFinalTest(`You scored ${score}/10. Let's run another final test so you can try again.`, { force: true });
      }
    };

    React.useEffect(() => {
      const objectives = Array.isArray(selectedCourse.objectives) ? selectedCourse.objectives : [];
      const objectiveStatus = Array.isArray(selectedCourseState.objectiveStatus) ? selectedCourseState.objectiveStatus : [];
      const allObjectivesCleared = objectives.length > 0 && objectives.every((_objective, index) => Boolean(objectiveStatus[index]));
      const finalTestPassed = Boolean(selectedCourseState.stats?.finalTest?.passed);

      if (allObjectivesCleared && !isCourseCompleted && !finalTestPassed && !activeFinalTest && !finalTestLoading && !courseCompletionPending && !activeQuizPrompt && !pendingFinalQuizKey && !pendingFinalQuizKeyRef.current) {
        startFinalTest(`All objectives are cleared. Final test time: answer 10 questions. You need at least 4/10 to complete ${selectedCourse.name}.`);
      }
    }, [selectedCourseId, selectedCourseState.objectiveStatus, selectedCourseState.completed, courseCompletionPending, activeQuizPrompt, pendingFinalQuizKey]);

    const handleSend = async () => {
      if (!input.trim() || isTyping || isCourseCompleted) return;
      
      const userText = input;
      const normalizeForComparison = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
      const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
      const lastAiDecision = [...messages].reverse().find((msg) => msg.role === 'ai' && msg.metadata?.aiDecision)?.metadata?.aiDecision;
      const repeatedInput = Boolean(lastUserMessage)
        && normalizeForComparison(lastUserMessage.text) !== ''
        && normalizeForComparison(lastUserMessage.text) === normalizeForComparison(userText)
        && Boolean(lastAiDecision?.objective_completed || lastAiDecision?.completed);
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
        const recentStudentEvidence = [...messages, userMsg]
          .filter((msg) => msg.role === 'user')
          .slice(-20)
          .map((msg) => msg.text)
          .filter(Boolean);
        const allStudentEvidence = [...messages, userMsg]
          .filter((msg) => msg.role === 'user')
          .map((msg) => msg.text)
          .filter(Boolean);
        const coveredConcepts = getCoveredConcepts([...messages, userMsg]);
        const runtimeCourseContext = Object.assign({}, courseContext, {
          repeatedInput,
          attemptCount: Number(selectedCourseState.questions || 0) + 1,
          recentStudentEvidence,
          cumulativeStudentEvidence: allStudentEvidence.slice(-40).join('\n\n'),
          coveredConcepts
        });

        const systemPrompt = `You are Buddy_AI, an encouraging study partner helping a student study ${selectedCourse.name}. Focus only on the current course topic: ${selectedCourse.focus}. The current course objectives are: ${(courseContext.objectives || []).join(' | ') || 'none listed'}. Score objectives from cumulative recent student evidence, not only the newest message. If the student explained part of an objective earlier and adds another part now, keep the earlier evidence and guide them to only the missing pieces. Do not ask again for any covered concept listed in courseContext.coveredConcepts. For multi-part objectives like Newton's three laws, track each law separately across messages and ask only for the laws or examples that are still missing. If an objective says the example/reaction/problem is provided by Buddy_AI, you must provide that example/reaction/problem before asking the student to identify or solve it. Be fair about objective completion: mark an objective complete when the student gives a clear explanation plus a concrete example, calculation, or reasoning chain; do not require extra repetition after that evidence exists. Do not mark completion for one short fact, a guess, or "I understand". If you create a quiz, make the options real subject answers, not labels like "a correct explanation" or "random fact".`;

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
        setMood(aiDecision?.mood || (isStruggling ? 'supportive' : 'focused'));

        let completionMsg = null;
        const quizKey = aiDecision?.quiz ? `${selectedCourseId}-${Date.now()}` : '';
        if (quizKey) {
          pendingFinalQuizKeyRef.current = quizKey;
        }
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

          const objectiveResult = await window.LivelyProgress.markObjectiveProgress(selectedCourseId, aiDecision || {});
          if (objectiveResult.newlyCompleted?.length) {
            window.dispatchEvent(new CustomEvent('livelyPlaySfx', { detail: { type: 'success' } }));
          }
          if (objectiveResult.allComplete && !selectedCourseState.completed) {
            if (aiDecision?.quiz && quizKey) {
              setPendingFinalQuizKey(quizKey);
            } else {
              pendingFinalQuizKeyRef.current = '';
              startFinalTest(`All objectives are cleared. Final test time: answer 10 questions. You need at least 4/10 to complete ${selectedCourse.name}.`);
            }
          } else if (quizKey) {
            pendingFinalQuizKeyRef.current = '';
          }
        }

        const aiMsg = { 
          role: 'ai', 
          text: sanitizeAssistantText(aiResponse), 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          metadata: { aiDecision }
        };
        const quizMsg = aiDecision?.quiz ? {
          role: 'ai',
          text: 'Quick quiz',
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          metadata: { type: 'quiz', quiz: aiDecision.quiz, quizKey }
        } : null;
        setMessages(prev => {
          const nextMessages = [...prev, aiMsg];
          if (quizMsg) nextMessages.push(quizMsg);
          if (completionMsg) nextMessages.push(completionMsg);
          return nextMessages;
        });
        if (quizMsg) {
          setActiveQuizPrompt({ quiz: aiDecision.quiz, quizKey });
        }
        // Persist AI message
        window.LivelyProgress.addChatMessage({
          role: aiMsg.role,
          text: aiMsg.text,
          time: aiMsg.time,
          courseId: selectedCourseId,
          metadata: aiMsg.metadata
        });
        if (quizMsg) {
          window.LivelyProgress.addChatMessage({
            role: quizMsg.role,
            text: quizMsg.text,
            time: quizMsg.time,
            courseId: selectedCourseId,
            metadata: quizMsg.metadata
          });
        }
        if (completionMsg) {
          window.LivelyProgress.addChatMessage({
            role: completionMsg.role,
            text: completionMsg.text,
            time: completionMsg.time,
            courseId: selectedCourseId,
            metadata: completionMsg.metadata
          });
        }

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
      <div className="panel relative flex-1 m-4 ml-0 flex flex-col overflow-hidden" data-name="ai-chat" data-file="components/workspace/AIChat.js">
        
        {/* Chat Header */}
        <div className="bg-discordDarkest p-3 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-discordDark rounded-full border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                <div className="icon-bot text-2xl text-white"></div>
              </div>
              {/* Mood Orb */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-discordDarkest shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-colors duration-500
                ${currentMood.tone}`}>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-200">Buddy_AI</h3>
              <p className="text-xs font-mono text-gray-400">{window.LivelyProgress.getSelectedCourse().name} • Online & Listening</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded bg-discordDark hover:bg-gray-600 flex items-center justify-center text-gray-400"
              title="Sound"
            >
              <div className="icon-volume-2 text-sm"></div>
            </button>
            <button
              type="button"
              onClick={handleHintRequest}
              disabled={isCourseCompleted}
              className="w-8 h-8 rounded bg-discordDark hover:bg-gray-600 flex items-center justify-center text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
              title="Spend 5 coins for a hint"
            >
              <div className="icon-lightbulb text-sm"></div>
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
                <div className={`p-3 rounded-lg text-sm leading-relaxed break-words whitespace-pre-wrap ${msg.role === 'user' ? 'bg-mcPurple text-white rounded-tr-none' : 'bg-discordDarkest text-gray-200 rounded-tl-none border border-gray-700'}`}>
                  {msg.metadata?.type === 'quiz' && msg.metadata?.quiz ? (() => {
                    const quiz = msg.metadata.quiz;
                    const quizKey = msg.metadata.quizKey || `${selectedCourseId}-${idx}`;
                    const selectedIndex = Number.isFinite(Number(msg.metadata.selectedIndex)) ? Number(msg.metadata.selectedIndex) : null;
                    const correctIndex = Number(quiz.correct_index ?? quiz.correctIndex ?? msg.metadata.correctIndex ?? 0);
                    const answered = selectedIndex !== null || answeredQuizKeys.includes(quizKey);
                    const selectedAnswer = selectedIndex !== null ? quiz.options?.[selectedIndex] : '';
                    const correctAnswer = quiz.options?.[correctIndex] || '';

                    return (
                      <div className="space-y-3 min-w-[240px]">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mcGreen mb-1">Quick Quiz</div>
                          <div className="font-bold text-sm">{quiz.question}</div>
                        </div>
                        <div className="grid gap-2">
                          {(quiz.options || []).map((option, optionIndex) => {
                            const isSelected = selectedIndex === optionIndex;
                            const isCorrectOption = correctIndex === optionIndex;
                            const answeredClass = answered && isCorrectOption
                              ? 'border-mcGreen bg-mcGreen/10 text-white'
                              : answered && isSelected
                                ? 'border-red-400 bg-red-400/10 text-white'
                                : 'border-gray-600 bg-discordDark';

                            return (
                              <button
                                key={`${idx}-${optionIndex}`}
                                type="button"
                                onClick={() => handleQuizAnswer(quiz, optionIndex, quizKey)}
                                disabled={isCourseCompleted || answered}
                                className={`text-left rounded border px-3 py-2 text-xs hover:border-mcGreen hover:text-white disabled:cursor-not-allowed disabled:opacity-80 ${answeredClass}`}
                              >
                                <span className="font-mono text-mcGreen mr-2">{String.fromCharCode(65 + optionIndex)}.</span>{option}
                              </button>
                            );
                          })}
                        </div>
                        {answered ? (
                          <div className="rounded border border-gray-600 bg-black/20 px-3 py-2 text-xs text-gray-200">
                            <div><span className="font-mono text-gray-400">Your answer:</span> {selectedAnswer || 'Answered'}</div>
                            <div className="mt-1"><span className="font-mono text-mcGreen">Correct answer:</span> {correctAnswer}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })() : msg.metadata?.type === 'sketch' && msg.metadata?.imageUrl ? (
                    <div className="space-y-2">
                      <div className="font-mono text-xs uppercase tracking-wider opacity-80">{msg.text || 'Sketch submitted'}</div>
                      <img src={msg.metadata.imageUrl} alt="Submitted sketch" className="max-h-56 max-w-full rounded border border-white/20 bg-discordDarkest object-contain" />
                    </div>
                  ) : renderFormattedMessage(msg.text)}
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
          {isCourseCompleted ? (
            <div className="mb-3 rounded-lg border border-mcGreen/40 bg-mcGreen/10 px-3 py-2 text-xs font-mono text-mcGreen">
              COURSE COMPLETED - chat is read-only for this course.
            </div>
          ) : null}
          <div className="bg-discordDark border border-gray-600 rounded-lg p-2 focus-within:border-mcGreen transition-colors flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={isCourseCompleted}
              placeholder={isCourseCompleted ? 'This completed course is locked for review only.' : `Hey, try explaining [${selectedCourse.name || 'this topic'}] to me like I'm five...`}
              className="w-full bg-transparent text-gray-200 font-sans text-sm resize-none outline-none p-2 min-h-[80px] custom-scrollbar"
            />
            <div className="flex justify-between items-center px-2 pb-1">
              <span className="text-xs font-mono text-gray-500">{isCourseCompleted ? 'Review only' : 'Press ENTER to send'}</span>
              <button 
                onClick={handleSend}
                disabled={isCourseCompleted}
                className="bg-mcGreen text-black font-bold font-pixel px-4 py-1.5 rounded hover:bg-[#44ee44] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                SEND <div className="icon-send text-sm"></div>
              </button>
            </div>
          </div>
        </div>

        {pendingHintConfirm ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-lg border border-yellow-400/50 bg-discordDarkest p-5 shadow-[0_0_28px_rgba(250,204,21,0.16)]">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">Spend Coins</div>
              <div className="text-lg font-bold text-white">Buy a hint for 5 coins?</div>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                Buddy_AI will give a hint for the current checkpoint without completing it for you.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingHintConfirm(false)}
                  className="rounded border border-gray-600 px-4 py-2 text-sm font-bold text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmHintRequest}
                  className="rounded bg-yellow-300 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-200"
                >
                  Spend 5
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeQuizPrompt ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-lg border border-mcGreen/60 bg-discordDarkest shadow-[0_0_28px_rgba(85,255,85,0.22)]">
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-mcGreen">Quick Quiz</div>
                  <div className="text-sm font-bold text-gray-100">Buddy_AI wants to check this</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveQuizPrompt(null)}
                  className="flex h-8 w-8 items-center justify-center rounded bg-discordDark text-gray-400 hover:text-white"
                  aria-label="Close quiz"
                >
                  <div className="icon-x text-sm"></div>
                </button>
              </div>
              <div className="space-y-4 p-4">
                <div className="text-base font-bold leading-snug text-white">{activeQuizPrompt.quiz.question}</div>
                <div className="grid gap-2">
                  {(activeQuizPrompt.quiz.options || []).map((option, optionIndex) => (
                    <button
                      key={`active-quiz-${optionIndex}`}
                      type="button"
                      onClick={() => handleQuizAnswer(activeQuizPrompt.quiz, optionIndex, activeQuizPrompt.quizKey)}
                      className="flex min-h-12 items-center gap-3 rounded border border-gray-600 bg-discordDark px-3 py-2 text-left text-sm text-gray-100 hover:border-mcGreen hover:bg-[#263128]"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-mcGreen font-mono font-bold text-black">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="leading-snug">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeFinalTest ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[92%] w-full max-w-3xl flex-col rounded-lg border border-blue-400/70 bg-discordDarkest shadow-[0_0_32px_rgba(96,165,250,0.22)]">
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">Final Test</div>
                  <div className="text-sm font-bold text-gray-100">{activeFinalTest.title}</div>
                </div>
                <div className="rounded border border-blue-400/40 bg-blue-400/10 px-3 py-1 text-xs font-mono text-blue-200">
                  Pass: {activeFinalTest.passScore}/10
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
                {(activeFinalTest.questions || []).map((question, questionIndex) => (
                  <div key={`final-${questionIndex}`} className="rounded border border-gray-700 bg-black/20 p-3">
                    <div className="mb-3 text-sm font-bold text-white">{question.question}</div>
                    <div className="grid gap-2">
                      {(question.options || []).map((option, optionIndex) => {
                        const selected = activeFinalTest.answers[questionIndex] === optionIndex;
                        return (
                          <button
                            key={`final-${questionIndex}-${optionIndex}`}
                            type="button"
                            onClick={() => handleFinalTestAnswer(questionIndex, optionIndex)}
                            className={`flex min-h-10 items-center gap-3 rounded border px-3 py-2 text-left text-xs transition-colors ${selected ? 'border-blue-400 bg-blue-400/15 text-white' : 'border-gray-600 bg-discordDark text-gray-200 hover:border-blue-400'}`}
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono font-bold ${selected ? 'bg-blue-400 text-black' : 'bg-black/30 text-blue-300'}`}>
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3">
                <span className="text-xs font-mono text-gray-400">
                  {activeFinalTest.answers.filter((answer) => answer !== null).length}/10 answered
                </span>
                <button
                  type="button"
                  onClick={submitFinalTest}
                  disabled={activeFinalTest.answers.some((answer) => answer === null)}
                  className="rounded bg-blue-400 px-4 py-2 font-pixel text-lg font-bold text-black hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  SUBMIT TEST
                </button>
              </div>
            </div>
          </div>
        ) : null}
        
      </div>
    );
  } catch (error) {
    console.error('AIChat error:', error);
    return null;
  }
}
