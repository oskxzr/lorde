import requests
import os
from typing import List, Dict
from datetime import datetime

def format_runtime(minutes: int) -> str:
    if not minutes:
        return "Unknown"
    hours = minutes // 60
    mins = minutes % 60
    if hours > 0:
        return {"s": f"{hours}h {mins}m", "m": minutes}
    return {"s": f"{mins}m", "m": minutes}

class Episode:
    def __init__(self, episode_data: dict):
        self.name = episode_data.get('name', '')
        self.description = episode_data.get('overview', '')
        self.image = f"https://image.tmdb.org/t/p/original{episode_data.get('still_path')}" if episode_data.get('still_path') else ''
        self.rating = episode_data.get('vote_average', 0.0)
        self.episode_number = episode_data.get('episode_number', 0)
        self.air_date = episode_data.get('air_date', '')
        self.runtime = format_runtime(episode_data.get('runtime', 0))

    def get_metadata(self) -> Dict:
        return {
            'name': self.name,
            'description': self.description,
            'image': self.image,
            'rating': self.rating,
            'episode_number': self.episode_number,
            'air_date': self.air_date,
            'time': self.runtime
        }

class Media:
    BASE_URL = "https://api.themoviedb.org/3"
    
    def __init__(self, entry):
        self._media_data = None
        self._images_data = None
        title = entry.get("name")
        year = entry.get("year")
        search_data = self._make_request("/search/multi", {"query": title})
        
        if not search_data.get('results'):
            raise ValueError(f"No media found with title: {title}")
        
        for result in search_data['results']:
            if result['media_type'] in ['tv', 'movie'] and (not year or year in result["first_air_date"]):
                self._media_type = result['media_type']
                media_id = result['id']
                self._media_data = self._make_request(f"/{self._media_type}/{media_id}")
                self._images_data = self._make_request(f"/{self._media_type}/{media_id}/images", {"include_image_language": "en,null"})
                break
        else:
            raise ValueError(f"No valid media found with title: {title}")

    def _make_request(self, endpoint: str, params: dict = None) -> dict:
        if params is None:
            params = {}
        params['api_key'] = os.environ["TMDB_KEY"]
        
        response = requests.get(f"{self.BASE_URL}{endpoint}", params=params)
        if response.status_code != 200:
            raise ValueError(f"API request failed: {response.status_code}")
        return response.json()

    @property
    def name(self) -> str:
        return self._media_data.get('name', '') or self._media_data.get('title', '')

    @property
    def description(self) -> str:
        return self._media_data.get('overview', '')

    @property
    def poster(self) -> str:
        path = self._media_data.get('poster_path')
        return f"https://image.tmdb.org/t/p/original{path}" if path else ''

    @property
    def backdrop(self) -> str:
        path = self._media_data.get('backdrop_path')
        return f"https://image.tmdb.org/t/p/original{path}" if path else ''

    @property
    def logo(self) -> str:
        if self._images_data and 'logos' in self._images_data:
            logos = self._images_data['logos']
            if logos:
                # Try to find English logo first
                for logo in logos:
                    if logo.get('iso_639_1') == 'en':
                        return f"https://image.tmdb.org/t/p/original{logo['file_path']}"
                # If no English logo, take the first one
                return f"https://image.tmdb.org/t/p/original{logos[0]['file_path']}"
        return ''

    @property
    def rating(self) -> float:
        return self._media_data.get('vote_average', 0.0)

    @property
    def type(self) -> str:
        return 'series' if self._media_type == 'tv' else 'movie'

    def get_episodes(self, season_number: int) -> List[Episode]:
        if self.type != 'series':
            raise ValueError("This media is not a series")
            
        season_data = self._make_request(f"/tv/{self._media_data['id']}/season/{season_number}")
        return [Episode(episode_data) for episode_data in season_data['episodes']]

    def get_seasons(self) -> List[int]:
        if self.type != 'series':
            raise ValueError("This media is not a series")
        return [season['season_number'] for season in self._media_data.get('seasons', [])]

    def get_metadata(self) -> Dict:
        metadata = {
            'name': self.name,
            'description': self.description,
            'poster': self.poster,
            'backdrop': self.backdrop,
            'logo': self.logo,
            'rating': self.rating,
            'type': self.type,
        }
        
        if self.type == 'series':
            metadata.update({
                'first_air_date': self._media_data.get('first_air_date', ''),
                'available_seasons': self.get_seasons()
            })
        else:
            metadata.update({
                'release_date': self._media_data.get('release_date', ''),
                'time': format_runtime(self._media_data.get('runtime', 0))
            })
            
        return metadata