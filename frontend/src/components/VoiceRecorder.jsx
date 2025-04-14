import { useState, useRef } from 'react';
import axios from 'axios';

const VoiceRecorder = ({ onVoiceCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings(prev => [...prev, { blob: audioBlob, url: audioUrl }]);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const uploadRecordings = async () => {
    if (recordings.length === 0) {
      alert('Please record at least one voice sample');
      return;
    }

    if (!voiceName) {
      alert('Please enter a name for your voice');
      return;
    }

    setIsUploading(true);
    try {
      // Convert blobs to base64
      const base64Recordings = await Promise.all(
        recordings.map(async (recording) => {
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(recording.blob);
          });
        })
      );

      const response = await axios.post('http://localhost:9999/.netlify/functions/clone_voice', {
        voice_name: voiceName,
        voice_samples: base64Recordings
      });

      if (response.data && response.data.voice_id) {
        onVoiceCreated(response.data.voice_id);
        alert('Voice successfully created!');
        setRecordings([]);
        setVoiceName('');
      }
    } catch (error) {
      console.error('Error uploading recordings:', error);
      alert('Error creating voice. Please try again.');
    }
    setIsUploading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Voice Recorder</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Voice Name:</label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter a name for your voice"
        />
      </div>

      <div className="mb-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full p-3 rounded-lg text-white font-bold ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Recordings ({recordings.length}):</h3>
        <div className="space-y-2">
          {recordings.map((recording, index) => (
            <div key={index} className="flex items-center space-x-2">
              <audio src={recording.url} controls className="w-full" />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={uploadRecordings}
        disabled={isUploading || recordings.length === 0}
        className={`w-full p-3 rounded-lg text-white font-bold ${
          isUploading || recordings.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isUploading ? 'Creating Voice...' : 'Create Voice'}
      </button>
    </div>
  );
};

export default VoiceRecorder;
