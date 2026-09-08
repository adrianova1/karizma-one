@@
-    const userMsg: Message = { role: 'user', content: question, timestamp: new Date().toISOString() };
-    const assistantMsg: Message = { role: 'assistant', content: coachResult.answer, timestamp: new Date().toISOString() };
+    const userMsg: Message = { role: 'user', content: question, timestamp: new Date().toISOString() };
+    const assistantMsg: Message = { role: 'assistant', content: coachResult.answer, structuredData: coachResult.structuredData, timestamp: new Date().toISOString() } as any;
*** End Patch