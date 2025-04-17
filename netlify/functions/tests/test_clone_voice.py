import json
import unittest
from unittest.mock import patch, MagicMock
import base64
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from clone_voice import handler, create_response

class TestCloneVoice(unittest.TestCase):
    def test_create_response(self):
        # Test successful response
        response = create_response(200, {'voice_id': '123'})
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(json.loads(response['body']), {'voice_id': '123'})
        
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

    def test_handler_missing_samples(self):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'voice_name': 'Test Voice'
            })
        }
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(json.loads(response['body']), {'error': 'No voice samples provided'})

    def test_handler_invalid_sample_format(self):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'voice_name': 'Test Voice',
                'voice_samples': ['invalid_base64']
            })
        }
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertTrue('Invalid voice sample format' in json.loads(response['body'])['error'])

    @patch('requests.post')
    def test_handler_successful_request(self, mock_post):
        # Create a mock response with a voice_id
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'voice_id': 'test_voice_123'}
        mock_post.return_value = mock_response

        # Create a valid base64 audio sample
        sample_audio = base64.b64encode(b'fake_audio_data').decode('utf-8')
        
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'voice_name': 'Test Voice',
                'voice_samples': [sample_audio]
            })
        }

        response = handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(json.loads(response['body']), {'voice_id': 'test_voice_123'})

        # Verify the API call
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        self.assertIn('https://api.elevenlabs.io/v1/voices/add', call_args[0])
        self.assertIn('files', call_args[1])
        self.assertIn('data', call_args[1])
        self.assertEqual(call_args[1]['data']['name'], 'Test Voice')

    @patch('requests.post')
    def test_handler_api_error(self, mock_post):
        # Mock API error response
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = 'API Error'
        mock_post.return_value = mock_response

        # Create a valid base64 audio sample
        sample_audio = base64.b64encode(b'fake_audio_data').decode('utf-8')
        
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'voice_name': 'Test Voice',
                'voice_samples': [sample_audio]
            })
        }

        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(json.loads(response['body']), {'error': 'API Error'})

    @patch('requests.post')
    def test_handler_missing_voice_id_in_response(self, mock_post):
        # Mock response without voice_id
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}  # Empty response
        mock_post.return_value = mock_response

        # Create a valid base64 audio sample
        sample_audio = base64.b64encode(b'fake_audio_data').decode('utf-8')
        
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'voice_name': 'Test Voice',
                'voice_samples': [sample_audio]
            })
        }

        response = handler(event, None)
        self.assertEqual(response['statusCode'], 500)
        self.assertEqual(json.loads(response['body']), {'error': 'No voice ID in response'})

if __name__ == '__main__':
    unittest.main()
