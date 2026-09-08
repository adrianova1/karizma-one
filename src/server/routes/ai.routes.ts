*** Begin Patch
*** Update File: src/server/routes/ai.routes.ts
@@
-    // Extract selected tone if present in question tag
-    let selectedTone = 'all';
-    const toneTagMatch = question.match(/\[لحن انتخابی:\s*([^\]]+)\]/);
-    if (toneTagMatch) {
-      selectedTone = toneTagMatch[1].trim();
-    }
+    // Extract selected tone if present in question tag and canonicalize it
+    let selectedTone = 'all';
+    const toneTagMatch = question.match(/\[لحن انتخابی:\s*([^\]\n\r]+)/) || question.match(/\[لحن انتخابی:\s*([^\]]+)\]/);
+    if (toneTagMatch) {
+      // Use PersianNormalizer.canonicalizeTone to map Persian/English labels to canonical keys
+      // import inside file to avoid cyclic deps at module load time
+      const { PersianNormalizer } = await import('../coach/PersianNormalizer.js');
+      selectedTone = PersianNormalizer.canonicalizeTone(toneTagMatch[1].trim());
+    } else if (req.body.selectedTone) {
+      const { PersianNormalizer } = await import('../coach/PersianNormalizer.js');
+      selectedTone = PersianNormalizer.canonicalizeTone(req.body.selectedTone);
+    }
@@
-    const coachResult = coachEngine.processQuery(question, {
-      conversationId,
-      customSystemPrompt,
-      history,
-      selectedTone
-    });
+    const coachResult = coachEngine.processQuery(question, {
+      conversationId,
+      customSystemPrompt,
+      history,
+      selectedTone
+    });
*** End Patch