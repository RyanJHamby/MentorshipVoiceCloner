import { useState, useRef } from 'react';
import axios from 'axios';

const TextToSpeech = ({ voiceId }) => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [includeQuote, setIncludeQuote] = useState(true);
  const [quotePosition, setQuotePosition] = useState('start');
  const audioRef = useRef(null);

  const generateSpeech = async () => {
    if (!text) {
      alert('Please enter some text');
      return;
    }

    if (!voiceId) {
      alert('Please create a voice first');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('http://localhost:9999/.netlify/functions/text_to_speech', {
        text,
        voice_id: voiceId,
        include_quote: includeQuote,
        quote_position: quotePosition
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });


      if (response.data && response.data.audio) {
        // Convert base64 to blob
        const audioBlob = new Blob(
          [Uint8Array.from(atob(response.data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Auto-play the generated audio
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      alert('Error generating speech. Please try again.');
    }
    setIsGenerating(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Text to Speech</h2>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Enter your text:</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 border rounded h-32"
          placeholder="Type what you want to hear..."
        />
      </div>

      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="includeQuote"
          checked={includeQuote}
          onChange={(e) => setIncludeQuote(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="includeQuote" className="mr-4">Include motivational quote</label>

        {includeQuote && (
          <select
            value={quotePosition}
            onChange={(e) => setQuotePosition(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="start">At Start</option>
            <option value="end">At End</option>
          </select>
        )}
      </div>

      <button
        onClick={generateSpeech}
        disabled={isGenerating || !voiceId}
        className={`w-full p-3 rounded-lg text-white font-bold mb-4 ${
          isGenerating || !voiceId
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isGenerating ? 'Generating Speech...' : 'Generate Speech'}
      </button>

      {audioUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Generated Audio:</h3>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {!voiceId && (
        <p className="text-red-500 mt-2">
          Please create a voice first using the Voice Recorder above.
        </p>
      )}
    </div>
  );
};

export default TextToSpeech;
