import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

def handler(event, context):
    # Only allow POST requests
    if event['httpMethod'] != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'})
        }

    try:
        # Parse the request body
        body = json.loads(event['body'])
        voice_samples = body.get('voice_samples', [])
        voice_name = body.get('voice_name', 'My Voice Clone')
        
        if not voice_samples:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No voice samples provided'})
            }

        # Prepare the files for upload
        files = []
        for i, sample in enumerate(voice_samples):
            files.append(('files', (f'sample_{i}.wav', sample, 'audio/wav')))

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
            return {
                'statusCode': response.status_code,
                'body': json.dumps({'error': response.text})
            }

        # Return the voice ID and details
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': response.text
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
