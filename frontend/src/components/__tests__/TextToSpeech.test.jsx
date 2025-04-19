import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import TextToSpeech from '../TextToSpeech';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn()
};
const mockSpeechSynthesisUtterance = jest.fn();
global.speechSynthesis = mockSpeechSynthesis;
global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();

describe('TextToSpeech Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    render(<TextToSpeech voiceId="test-voice-id" />);
    expect(screen.getByPlaceholderText('Type what you want to hear...')).toBeInTheDocument();
  });

  it('shows warning when no voice ID is provided', () => {
    render(<TextToSpeech />);
    expect(screen.getByText('Please create a voice first using the Voice Recorder above.')).toBeInTheDocument();
  });

  it('enforces character limit', async () => {
    render(<TextToSpeech voiceId="test-voice-id" />);
    const textarea = screen.getByPlaceholderText('Type what you want to hear...');
    const longText = 'a'.repeat(1001);
    
    await userEvent.type(textarea, longText);
    expect(textarea.value.length).toBe(1000);
    expect(screen.getByText('1000/1000 characters')).toBeInTheDocument();
  });

  it('handles text preview with browser speech synthesis', async () => {
    render(<TextToSpeech voiceId="test-voice-id" />);
    const textarea = screen.getByPlaceholderText('Type what you want to hear...');
    const previewButton = screen.getByText('Preview (Browser Voice)');

    // Initially preview button should be disabled
    expect(previewButton).toBeDisabled();

    // Type some text
    await userEvent.type(textarea, 'Test text');
    expect(previewButton).not.toBeDisabled();

    // Start preview
    fireEvent.click(previewButton);
    expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('Test text');
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    expect(screen.getByText('Stop Preview')).toBeInTheDocument();

    // Stop preview
    fireEvent.click(screen.getByText('Stop Preview'));
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  it('loads history from localStorage on mount', () => {
    const mockHistory = [
      { text: 'Test 1', timestamp: '2025-04-18T12:00:00Z', includeQuote: true, quotePosition: 'start' }
    ];
    localStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

    render(<TextToSpeech voiceId="test-voice-id" />);
    expect(screen.getByText('Test 1')).toBeInTheDocument();
  });

  it('saves to history when generating speech', async () => {
    const mockAudioResponse = {
      data: {
        audio: 'base64audio',
        text: 'Generated text'
      }
    };
    axios.post.mockResolvedValue(mockAudioResponse);

    render(<TextToSpeech voiceId="test-voice-id" />);
    const textarea = screen.getByPlaceholderText('Type what you want to hear...');
    
    await userEvent.type(textarea, 'Test text');
    fireEvent.click(screen.getByText('Generate Speech'));

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalled();
      const savedHistory = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(savedHistory[0].text).toBe('Test text');
    });
  });

  it('reuses text from history', async () => {
    const mockHistory = [
      { 
        text: 'Historical text',
        timestamp: '2025-04-18T12:00:00Z',
        includeQuote: true,
        quotePosition: 'end'
      }
    ];
    localStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

    render(<TextToSpeech voiceId="test-voice-id" />);
    
    // Click "Use this text" button
    fireEvent.click(screen.getByText('Use this text'));

    // Verify text and settings are restored
    expect(screen.getByPlaceholderText('Type what you want to hear...').value).toBe('Historical text');
    expect(screen.getByLabelText('Include motivational quote')).toBeChecked();
    expect(screen.getByDisplayValue('end')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('API Error');
    axios.post.mockRejectedValue(mockError);

    render(<TextToSpeech voiceId="test-voice-id" />);
    const textarea = screen.getByPlaceholderText('Type what you want to hear...');
    
    await userEvent.type(textarea, 'Test text');
    fireEvent.click(screen.getByText('Generate Speech'));

    await waitFor(() => {
      expect(screen.getByText('Error generating speech. Please try again.')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('validates required input before generating speech', async () => {
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<TextToSpeech voiceId="test-voice-id" />);
    fireEvent.click(screen.getByText('Generate Speech'));
    
    expect(mockAlert).toHaveBeenCalledWith('Please enter some text');
    mockAlert.mockRestore();
  });

  it('handles motivational quote options', async () => {
    render(<TextToSpeech voiceId="test-voice-id" />);
    
    const quoteCheckbox = screen.getByLabelText('Include motivational quote');
    const textarea = screen.getByPlaceholderText('Type what you want to hear...');
    
    // Type some text
    await userEvent.type(textarea, 'Test text');

    // Toggle quote option
    fireEvent.click(quoteCheckbox);
    expect(quoteCheckbox).not.toBeChecked();
    expect(screen.queryByDisplayValue('start')).not.toBeInTheDocument();

    // Toggle back on
    fireEvent.click(quoteCheckbox);
    expect(quoteCheckbox).toBeChecked();
    expect(screen.getByDisplayValue('start')).toBeInTheDocument();

    // Change quote position
    fireEvent.change(screen.getByDisplayValue('start'), { target: { value: 'end' } });
    expect(screen.getByDisplayValue('end')).toBeInTheDocument();
  });
});
