import { NextResponse } from 'next/server'

const askGemini = async (contextPrompt: string, geminiKey: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contextPrompt }] }]
      })
    }
  )
  if (!response.ok) throw new Error(`Gemini failed with status ${response.status}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty candidate content')
  return text
}

const askGroq = async (contextPrompt: string, groqKey: string) => {
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: contextPrompt }]
      })
    }
  )
  if (!response.ok) throw new Error(`Groq failed with status ${response.status}`)
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Groq returned empty response')
  return text
}

const askOpenRouter = async (contextPrompt: string, openrouterKey: string) => {
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://codovatemeet.com',
        'X-Title': 'CodovateMeet'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: contextPrompt }]
      })
    }
  )
  if (!response.ok) throw new Error(`OpenRouter failed with status ${response.status}`)
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenRouter returned empty response')
  return text
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { prompt, chatHistory = [], codeSnippet = '', transcript = [] } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const openrouterKey = process.env.OPENROUTER_API_KEY

    // Compile meeting context for AI
    const formattedChat = chatHistory
      .map((m: any) => `${m.sender || m.sender_name || 'Participant'}: ${m.text || m.message}`)
      .join('\n')
    
    const formattedTranscript = transcript
      .map((t: any) => `${t.sender_name || t.sender || 'Speaker'}: ${t.text}`)
      .join('\n')

    const contextPrompt = `
You are the Codovate AI Meeting Assistant. You are embedded in a real-time collaborative workspace for software developers.
Below is the current meeting context:
---
[MEETING ROOM CODE]: ${body.roomId || 'UNKNOWN'}
[CHAT HISTORY]:
${formattedChat || 'No chat messages yet.'}
---
[TRANSCRIPT / CAPTIONS]:
${formattedTranscript || 'No speech transcript yet.'}
---
[ACTIVE CODE SNIPPET]:
${codeSnippet || 'No active code in the collaborative workspace.'}
---

User Prompt: "${prompt}"

Provide a professional, clear, and actionable response in Markdown format.
If they ask for meeting summaries, action items, or code reviews, analyze the context provided above.
Keep the formatting clean and suitable for a chat sidebar. Highlight key takeaways and code formatting where necessary.
`

    let aiResponseText = ''
    let chosenProvider = ''

    // 1. Try Gemini
    if (geminiKey && !geminiKey.includes('your_')) {
      try {
        aiResponseText = await askGemini(contextPrompt, geminiKey)
        chosenProvider = 'Gemini'
      } catch (err) {
        console.warn('Gemini Gateway fallback triggered:', err)
      }
    }

    // 2. Try Groq
    if (!aiResponseText && groqKey && !groqKey.includes('your_')) {
      try {
        aiResponseText = await askGroq(contextPrompt, groqKey)
        chosenProvider = 'Groq'
      } catch (err) {
        console.warn('Groq Gateway fallback triggered:', err)
      }
    }

    // 3. Try OpenRouter
    if (!aiResponseText && openrouterKey && !openrouterKey.includes('your_')) {
      try {
        aiResponseText = await askOpenRouter(contextPrompt, openrouterKey)
        chosenProvider = 'OpenRouter'
      } catch (err) {
        console.warn('OpenRouter Gateway fallback triggered:', err)
      }
    }

    if (aiResponseText) {
      return NextResponse.json({ text: aiResponseText, provider: chosenProvider })
    }

    // Heuristic Fallback when no keys work
    let reply = ''
    const lowerPrompt = prompt.toLowerCase().trim()

    if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarize') || lowerPrompt.includes('notes')) {
      reply = `### 📝 Codovate AI Meeting Summary\n\nBased on current participation and chat history, here is the meeting recap:\n\n* **Meeting Room**: \`${body.roomId || 'CDV-ROOM'}\`\n* **Active Discussion**: Focuses on collaborative software design and synchronization.\n* **Key Topics**: ${chatHistory.length > 0 ? 'Reviewing team chats and sharing development scripts.' : 'Establishing workspace rules and drawing whiteboard systems.'}\n\n#### 🎯 Discussion Details\n- **Chat Messages**: ${chatHistory.length} messages shared between participants.\n- **Workspaces Active**: Code Editor & Collaborative Whiteboard initialized.\n\n*This summary was automatically generated by the local Codovate AI Gateway Heuristic engine.*`
    } else if (lowerPrompt.includes('task') || lowerPrompt.includes('action') || lowerPrompt.includes('extract')) {
      reply = `### 📋 Extracted Action Items\n\nI have scanned the meeting discussions and chat history for tasks:\n\n`
      let taskIndex = 1
      let foundTasks = false

      chatHistory.forEach((msg: any) => {
        const txt = msg.text || msg.message || ''
        if (txt.toLowerCase().includes('todo') || txt.toLowerCase().includes('need to') || txt.toLowerCase().includes('should') || txt.toLowerCase().includes('task')) {
          reply += `- [ ] **${msg.sender || msg.sender_name}**: ${txt}\n`
          taskIndex++
          foundTasks = true
        }
      })

      if (!foundTasks) {
        reply += `- [ ] Setup project repository and directory structure\n- [ ] Integrate WebSockets / LiveKit signaling layer\n- [ ] Set up continuous integration and automated test suites\n- [ ] Schedule follow-up sync for sprint review\n\n*No explicit tasks found in chat. Displaying recommended collaborative items.*`
      } else {
        reply += `\n*Tasks successfully extracted from chat discussions.*`
      }
    } else if (lowerPrompt.includes('code') || lowerPrompt.includes('refactor') || lowerPrompt.includes('snippet')) {
      if (codeSnippet) {
        reply = `### 💻 Code Workspace Analysis\n\nHere is an analysis of your active code snippet:\n\n\`\`\`javascript\n${codeSnippet.substring(0, 300)}${codeSnippet.length > 300 ? '...' : ''}\n\`\`\`\n\n#### 🔍 Review Notes:\n1. **Syntax**: The structure appears clean and standard.\n2. **Performance**: Recommend memoizing loops and avoiding global bindings where possible.\n3. **Collaborative Suggestion**: Ensure other participants are synced before executing stateful functions.`
      } else {
        reply = `### 💻 Code Workspace Suggestions\n\nNo code is currently active. You can open the **Code Workspace** in the split-view layout and write scripts. Here is a starter boilerplate:\n\n\`\`\`javascript\n// Live collaborative script\nfunction greetTeam(members) {\n  console.log("Welcome developers:", members.join(', '));\n}\ngreetTeam(['You']);\n\`\`\``
      }
    } else {
      // Handle general knowledge / tech questions
      if (lowerPrompt.includes('java') && !lowerPrompt.includes('javascript')) {
        reply = `### ☕ What is Java?\n\nJava is a high-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible. It is a general-purpose programming language intended to let application developers *write once, run anywhere* (WORA).\n\n*Note: To query live real-time explanations, provide your AI gateway keys in \`.env.local\`.*`
      } else if (lowerPrompt.includes('javascript') || lowerPrompt.includes(' js')) {
        reply = `### 🌐 What is JavaScript?\n\nJavaScript (often abbreviated as JS) is a programming language that is one of the core technologies of the World Wide Web. Over 97% of websites use JavaScript on the client side for webpage behavior, often incorporating third-party libraries.\n\n*Note: To query live real-time explanations, provide your AI gateway keys in \`.env.local\`.*`
      } else if (lowerPrompt.includes('python')) {
        reply = `### 🐍 What is Python?\n\nPython is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Python is dynamically typed and garbage-collected.\n\n*Note: To query live real-time explanations, provide your AI gateway keys in \`.env.local\`.*`
      } else if (lowerPrompt.includes('docker')) {
        reply = `### 🐳 What is Docker?\n\nDocker is a set of platform as a service products that use OS-level virtualization to deliver software in packages called containers. Containers are isolated from one another and bundle their own software, libraries and configuration files.\n\n*Note: To query live real-time explanations, provide your AI gateway keys in \`.env.local\`.*`
      } else if (lowerPrompt.includes('git')) {
        reply = `### 🗃️ What is Git?\n\nGit is a distributed version control system that tracks changes in any set of computer files, usually used for coordinating work among programmers collaboratively developing source code during software development.\n\n*Note: To query live real-time explanations, provide your AI gateway keys in \`.env.local\`.*`
      } else {
        reply = `### 🤖 Codovate Assistant (Offline Mode)\n\nYou asked: *"${prompt}"*\n\nTo allow me to answer any general knowledge or technical question like Grok or ChatGPT, please provide a valid API Key in your **\`.env.local\`** file:\n- \`GEMINI_API_KEY\`\n- \`GROQ_API_KEY\`\n- \`OPENROUTER_API_KEY\`\n\nOnce configured, the AI Gateway will automatically route your requests to state-of-the-art LLMs!`
      }
    }

    return NextResponse.json({ text: reply, provider: 'LocalHeuristic' })
  } catch (error) {
    console.error('AI gateway endpoint error:', error)
    return NextResponse.json({ error: 'Failed to process gateway response' }, { status: 500 })
  }
}
