import json
import os
import requests
import random
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

# Simple list of motivational quotes (you can expand this or use an external API)
MOTIVATIONAL_QUOTES = [
    "Believe you can and you're halfway there.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Don't watch the clock; do what it does. Keep going.",
    "Everything you've ever wanted is on the other side of fear."
]

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
        text = body.get('text', '')
        voice_id = body.get('voice_id', '')
        include_quote = body.get('include_quote', False)
        quote_position = body.get('quote_position', 'start')  # 'start' or 'end'

        if not text or not voice_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Text and voice_id are required'})
            }

        # Add motivational quote if requested
        if include_quote:
            quote = random.choice(MOTIVATIONAL_QUOTES)
            if quote_position == 'start':
                text = f"{quote} {text}"
            else:
                text = f"{text} {quote}"

        # Prepare the request to ElevenLabs
        headers = {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
        }

        data = {
            'text': text,
            'model_id': 'eleven_monolingual_v1',
            'voice_settings': {
                'stability': 0.75,
                'similarity_boost': 0.75
            }
        }

        # Make request to ElevenLabs API
        response = requests.post(
            f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}",
            headers=headers,
            json=data
        )

        if response.status_code != 200:
            return {
                'statusCode': response.status_code,
                'body': json.dumps({'error': response.text})
            }

        # Return the audio content as base64
        import base64
        audio_base64 = base64.b64encode(response.content).decode('utf-8')

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'audio': audio_base64,
                'text': text  # Return the text with quote if it was added
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
