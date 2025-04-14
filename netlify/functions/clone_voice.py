import json
import os
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

def create_response(status_code, body, is_error=False):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps({'error': body} if is_error else body)
    }

def handler(event, context):
    # Handle OPTIONS request for CORS preflight
    if event['httpMethod'] == 'OPTIONS':
        return create_response(200, {'message': 'OK'})

    # Only allow POST requests
    if event['httpMethod'] != 'POST':
        return create_response(405, 'Method not allowed', True)

    try:
        # Parse the request body
        body = json.loads(event['body'])
        voice_samples = body.get('voice_samples', [])
        voice_name = body.get('voice_name', 'My Voice Clone')
        
        if not voice_samples:
            return create_response(400, 'No voice samples provided', True)

        # Prepare the files for upload
        files = []
        for i, sample in enumerate(voice_samples):
            # Convert base64 string to bytes
            try:
                sample_bytes = base64.b64decode(sample)
                files.append(('files', (f'sample_{i}.wav', sample_bytes, 'audio/wav')))
            except Exception as e:
                return create_response(400, f'Invalid voice sample format: {str(e)}', True)

        # Add voice name
        data = {
            'name': voice_name,
            'description': 'Voice clone created with MentorVoice'
        }

        # Make request to ElevenLabs API
        headers = {
            'xi-api-key': ELEVENLABS_API_KEY
        }

        response = requests.post(
            f"{ELEVENLABS_API_URL}/voices/add",
            headers=headers,
            data=data,
            files=files
        )

        if response.status_code != 200:
            return create_response(response.status_code, response.text, True)

        # Parse the response to get just the voice ID
        try:
            response_data = response.json()
            voice_id = response_data.get('voice_id')
            if not voice_id:
                return create_response(500, 'No voice ID in response', True)
            return create_response(200, {'voice_id': voice_id})
        except Exception as e:
            return create_response(500, f'Error parsing response: {str(e)}', True)

    except Exception as e:
        return create_response(500, str(e), True)
