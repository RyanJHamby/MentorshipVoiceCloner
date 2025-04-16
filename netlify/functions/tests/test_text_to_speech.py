import json
import unittest
from unittest.mock import patch, MagicMock
import base64
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from text_to_speech import handler, create_response, MOTIVATIONAL_QUOTES

class TestTextToSpeech(unittest.TestCase):
    def test_create_response(self):
        # Test successful response
        response = create_response(200, {'message': 'success'})
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(json.loads(response['body']), {'message': 'success'})
        
        # Test error response
        error_response = create_response(400, 'Bad Request', True)
        self.assertEqual(error_response['statusCode'], 400)
        self.assertEqual(json.loads(error_response['body']), {'error': 'Bad Request'})

    def test_handler_options_request(self):
        event = {'httpMethod': 'OPTIONS'}
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(json.loads(response['body']), {'message': 'OK'})

    def test_handler_invalid_method(self):
        event = {'httpMethod': 'GET'}
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 405)
        self.assertEqual(json.loads(response['body']), {'error': 'Method not allowed'})

    def test_handler_missing_parameters(self):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({})
        }
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(json.loads(response['body']), {'error': 'Text and voice_id are required'})

    @patch('requests.post')
    def test_handler_successful_request(self, mock_post):
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'audio_content'
        mock_post.return_value = mock_response

        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'text': 'Hello world',
                'voice_id': 'test_voice_id'
            })
        }

        response = handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        response_body = json.loads(response['body'])
        self.assertEqual(response_body['text'], 'Hello world')
        self.assertEqual(response_body['audio'], base64.b64encode(b'audio_content').decode('utf-8'))

    @patch('requests.post')
    def test_handler_with_motivational_quote(self, mock_post):
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'audio_content'
        mock_post.return_value = mock_response

        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'text': 'Hello world',
                'voice_id': 'test_voice_id',
                'include_quote': True,
                'quote_position': 'start'
            })
        }

        response = handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        response_body = json.loads(response['body'])
        # Check that the response text contains both the original text and a quote
        self.assertIn('Hello world', response_body['text'])
        self.assertTrue(any(quote in response_body['text'] for quote in MOTIVATIONAL_QUOTES))

    @patch('requests.post')
    def test_handler_api_error(self, mock_post):
        # Mock API error response
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = 'API Error'
        mock_post.return_value = mock_response

        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'text': 'Hello world',
                'voice_id': 'test_voice_id'
            })
        }

        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(json.loads(response['body']), {'error': 'ElevenLabs API error: API Error'})

if __name__ == '__main__':
    unittest.main()
