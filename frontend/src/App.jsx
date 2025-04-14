import { useState } from 'react'
import VoiceRecorder from './components/VoiceRecorder'
import TextToSpeech from './components/TextToSpeech'
import './App.css'

function App() {
  const [voiceId, setVoiceId] = useState(null)

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MentorVoice</h1>
          <p className="text-gray-600">
            Clone your voice and create motivational messages
          </p>
        </header>

        <main className="space-y-8">
          <VoiceRecorder onVoiceCreated={setVoiceId} />
          <TextToSpeech voiceId={voiceId} />
        </main>

        {voiceId && (
          <div className="text-center text-sm text-gray-500">
            Voice ID: {voiceId}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
