import json
import pandas as pd
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
import logging
from typing import Dict, List, Optional, Tuple
import re
import os
from anthropic import Anthropic
import backoff
import anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('reit_cleaner.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class REITCleaner:
    def __init__(self, input_file: str, output_file: str):
        self.input_file = input_file
        self.output_file = output_file
        # Increase timeout and add custom headers
        self.geolocator = Nominatim(
            user_agent="reit_cleaner_v2",
            timeout=30,
            domain='nominatim.openstreetmap.org'
        )
        
        # Initialize Claude client properly with API key
        api_key = os.getenv('CLAUDE_API_KEY')
        if not api_key:
            raise ValueError("CLAUDE_API_KEY environment variable not set")
        self.claude = Anthropic(api_key=api_key)
        
        # Market coordinates remain the same
        self.market_coords = {
            "New York": (40.7128, -74.0060),
            "Los Angeles": (34.0522, -118.2437),
            "Chicago": (41.8781, -87.6298),
            "Houston": (29.7604, -95.3698),
            "Atlanta": (33.7490, -84.3880),
            "Washington DC": (38.9072, -77.0369)
        }
        
        # Increase market radius to catch more valid properties
        self.market_radius = 1.5  # Approximately 103 miles
        
    def clean_address(self, address: str) -> Optional[str]:
        """Enhanced address cleaning"""
        if not address or not isinstance(address, str):
            return None
            
        # Add these new patterns
        # 1. Handle duplicate addresses with different formatting
        address = re.sub(r'(\d+[^,]+)(?:\s*,?\s*\1)+', r'\1', address, flags=re.IGNORECASE)
        
        # 2. Better handling of truncated city/state
        address = re.sub(r',\s*(?:frankl|il segundo)', lambda m: 
            ', franklin' if 'frankl' in m.group() else ', el segundo', address)
        
        # 3. Handle data center specific patterns
        address = re.sub(r'(?:lax|dc|ny|ch)\d+\s*', '', address, flags=re.IGNORECASE)  # Remove data center codes
        address = re.sub(r'\d+\s*data centers?\s*', '', address, flags=re.IGNORECASE)  # Remove "4 data centers" etc.
        
        # 4. Better handling of street types
        street_types = {
            r'\bst\b': 'street',
            r'\bave\b': 'avenue',
            r'\bblvd\b': 'boulevard',
            r'\bdr\b': 'drive',
            r'\brd\b': 'road',
            r'\bcir\b': 'circle',
            r'\bpkwy\b': 'parkway',
        }
        
        # 5. Add missing commas before state/city
        cities_states = [
            (r'(\w+\s+)(?:tx|ga|nc|dc|md|va|ca|il)(\s|$)', r'\1, \2'),  # Add comma before state
            (r'(\w+\s+)(?:houston|atlanta|chicago|ashburn|charlotte)(\s|$)', r'\1, \2'),  # Add comma before city
        ]
        
        # Remove duplicate address instances
        address = re.sub(r'(\d+[^,]+),?\s+\1', r'\1', address)
        
        # Better handling of building/unit info
        address = re.sub(r',?\s*(?:building|unit|suite)\s+[a-z0-9](?!\d)', '', address, flags=re.IGNORECASE)
        
        # Remove common non-address phrases
        remove_phrases = [
            r'self storage units near',
            r'power provider.*$',
            r'data center.*$',
            r'ibx.*$',
            r'with access to.*$',
            r'see our.*$',
            r'is located at(.*?)(?=\d|$)',  # Capture address after "is located at"
        ]
        
        for phrase in remove_phrases:
            address = re.sub(phrase, '', address, flags=re.IGNORECASE)
        
        # Extract zip code if present and reattach at end
        zip_match = re.search(r'(\d{5})(?:-\d{4})?', address)
        zip_code = zip_match.group(1) if zip_match else None
        
        # State abbreviation corrections
        state_corrections = {
            r'\bma\b(?!\w)': 'md',  # Maryland
            r'\bte\b(?!\w)': 'tx',  # Texas
            r'\bno\b(?!\w)': 'nc',  # North Carolina
            r'\bel\b(?!\w)': 'il',  # Illinois
            r'\ban\b(?!\w)': 'ga',  # Georgia (Atlanta)
            r'\bfi\b(?!\w)': 'fl',  # Florida
            r'\bgi\b(?!\w)': 'ga',  # Georgia
            r'\bra\b(?!\w)': 'ga',  # Georgia (Atlanta region)
        }
        
        # Remove descriptive/distance-based addresses
        invalid_patterns = [
            r'^\d+\s*(?:mins|kilometers|miles)\s+',
            r'^(?:located|situated|positioned)\s+',
            r'^\d+\s*cooling\s+',
            r'in the attractive',
            r'away, and',
        ]
        
        for pattern in invalid_patterns:
            if re.search(pattern, address.lower()):
                return None
        
        # Clean the address
        cleaned = address.lower()
        
        # Remove truncation patterns
        truncation_patterns = [
            r'\.\.\.',
            r', *(?:an|wh|pr|ma|te|no|lo|di|ce|fi|gi|ra)$',
            r'(?:in|is located in|known as|owned by) .*$',
            r'\d+ (?:mins|kilometers|miles) .*$',
            r'(?:view all units|admin fee).*$',
            r'(?:company email address).*$',
            r'\s*,\s*(?:us|usa)$'
        ]
        
        for pattern in truncation_patterns:
            cleaned = re.sub(pattern, '', cleaned)
        
        # Correct state abbreviations
        for wrong, right in state_corrections.items():
            cleaned = re.sub(wrong, right, cleaned)
        
        # Remove extra whitespace and normalize separators
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = re.sub(r',\s*,', ',', cleaned)
        cleaned = cleaned.strip(' ,.')
        
        # Add state if missing but city is present
        state_patterns = {
            r'los angeles': ', ca',
            r'new york': ', ny',
            r'chicago': ', il',
            r'houston': ', tx',
            r'atlanta': ', ga',
            r'washington': ', dc'
        }
        
        for city, state in state_patterns.items():
            if re.search(rf'\b{city}\b(?!.*(?:ca|ny|il|tx|ga|dc))', cleaned):
                cleaned += state
        
        # Ensure address has valid format
        address_pattern = r'\d+.*?(?:street|st\b|avenue|ave\b|road|rd\b|boulevard|blvd\b|drive|dr\b|lane|ln\b|way|court|ct\b|circle|cir\b|parkway|pkwy\b|highway|hwy\b)'
        if not re.search(address_pattern, cleaned):
            return None
            
        # Remove truncated endings
        cleaned = re.sub(r',\s*[a-z]{2}$', '', cleaned)  # Remove 2-letter truncations
        
        # Standardize directionals
        directionals = {
            r'\bnw\b': 'northwest',
            r'\bne\b': 'northeast',
            r'\bsw\b': 'southwest',
            r'\bse\b': 'southeast'
        }
        for abbr, full in directionals.items():
            cleaned = re.sub(abbr, full, cleaned)
        
        # Add comma before city names if missing
        for city in ['houston', 'atlanta', 'durham', 'washington']:
            cleaned = re.sub(f'([a-z])\s+{city}', r'\1, {city}', cleaned)
        
        # Ensure state is included for known cities
        city_states = {
            'durham': 'nc',
            'houston': 'tx',
            'atlanta': 'ga',
            'washington': 'dc'
        }
        for city, state in city_states.items():
            if f', {city}' in cleaned and not re.search(r',\s*[a-z]{2}\s*$', cleaned):
                cleaned = f"{cleaned}, {state}"
        
        # Remove template variables and descriptive text
        address = re.sub(r'\{[^}]+\}', '', address)  # Remove {city} template vars
        address = re.sub(r'where companies.*$', '', address)  # Remove descriptive suffixes
        address = re.sub(r'is situated.*$', '', address)  # Remove location descriptions
        address = re.sub(r'our digital.*$', '', address)  # Remove facility descriptions
        
        logger.debug(f"Address cleaning: {address} -> {cleaned}")
        return cleaned
    
    def is_valid_for_market(self, lat: float, lon: float, market: str) -> bool:
        """Check if coordinates are within reasonable distance of market center."""
        if market not in self.market_coords:
            return False
            
        market_lat, market_lon = self.market_coords[market]
        distance = ((lat - market_lat) ** 2 + (lon - market_lon) ** 2) ** 0.5
        return distance <= self.market_radius
    
    def geocode_address(self, address: str) -> Tuple[Optional[float], Optional[float]]:
        """Add deduplication check"""
        # Add this at the beginning
        # Check if we've already successfully geocoded this address
        if hasattr(self, '_geocoded_cache'):
            normalized = re.sub(r'\s+', ' ', address.lower().strip())
            if normalized in self._geocoded_cache:
                return self._geocoded_cache[normalized]
        else:
            self._geocoded_cache = {}

        def try_geocode(addr: str) -> Optional[Tuple[float, float]]:
            try:
                location = self.geolocator.geocode(f"{addr}, United States")
                if location:
                    return location.latitude, location.longitude
                return None
            except (GeocoderTimedOut, GeocoderServiceError):
                return None

        # First attempt: Try original cleaned address
        logger.debug(f"Attempting geocode with original address: {address}")
        result = try_geocode(address)
        if result:
            # If successful, cache the result
            normalized = re.sub(r'\s+', ' ', address.lower().strip())
            self._geocoded_cache[normalized] = result
            return result

        # Second attempt: Try standardizing the address format
        standardized = self._standardize_address(address)
        if standardized != address:
            logger.debug(f"Attempting geocode with standardized address: {standardized}")
            result = try_geocode(standardized)
            if result:
                # If successful, cache the result
                normalized = re.sub(r'\s+', ' ', address.lower().strip())
                self._geocoded_cache[normalized] = result
                return result

        # Third attempt: Try removing unit numbers and other details
        simplified = re.sub(r'(?:suite|unit|#|apt\.?|apartment)\s*[\w-]+,?', '', address, flags=re.IGNORECASE)
        simplified = re.sub(r'\s+,', ',', simplified)
        if simplified != address:
            logger.debug(f"Attempting geocode with simplified address: {simplified}")
            result = try_geocode(simplified)
            if result:
                # If successful, cache the result
                normalized = re.sub(r'\s+', ' ', address.lower().strip())
                self._geocoded_cache[normalized] = result
                return result

        # Final attempt: Use Claude for complex cases
        # Only use Claude if the address seems problematic
        if self._needs_claude_enrichment(address):
            logger.info(f"Attempting Claude enrichment for: {address}")
            enriched = self.enrich_address_with_claude(address)
            if enriched and enriched != address:
                logger.debug(f"Attempting geocode with Claude-enriched address: {enriched}")
                result = try_geocode(enriched)
                if result:
                    # If successful, cache the result
                    normalized = re.sub(r'\s+', ' ', address.lower().strip())
                    self._geocoded_cache[normalized] = result
                    return result

        return None, None

    def _standardize_address(self, address: str) -> str:
        """Standardize address format"""
        # Common abbreviations
        abbrev_map = {
            r'\bst\b': 'street',
            r'\bave?\b': 'avenue',
            r'\brd\b': 'road',
            r'\bblvd\b': 'boulevard',
            r'\bdr\b': 'drive',
            r'\bln\b': 'lane',
            r'\bct\b': 'court',
            r'\bcir\b': 'circle',
            r'\bpkwy\b': 'parkway',
            r'\bhwy\b': 'highway',
            r'\bsq\b': 'square',
            r'\bpl\b': 'place'
        }
        
        result = address.lower()
        for abbr, full in abbrev_map.items():
            result = re.sub(abbr, full, result, flags=re.IGNORECASE)
        
        return result

    def _needs_claude_enrichment(self, address: str) -> bool:
        """Enhanced check for Claude enrichment"""
        problematic_patterns = [
            # Add these patterns
            r'(?:lax|dc|ny|ch)\d+',  # Data center codes
            r'\d+\s*data centers?',   # Data center counts
            r'(?:frankl|il segundo)', # Truncated cities
            r'(?<!,)\s+(?:houston|atlanta|chicago|ashburn|charlotte)(?:\s|$)',  # Missing comma before city
            r'\b(?:exemplifies|innovation|digital|infrastructure)\b',  # Descriptive terms
            *self.existing_patterns   # Keep existing patterns
        ]
        return any(re.search(pattern, address, re.IGNORECASE) for pattern in problematic_patterns)

    @backoff.on_exception(backoff.expo, Exception, max_tries=3)
    def enrich_address_with_claude(self, address: str) -> Optional[str]:
        """Use Claude to fix problematic addresses"""
        try:
            response = self.claude.beta.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": f"""Fix and standardize this address for geocoding. If the address is invalid or contains template variables, return None.

                    Input address: {address}
                    
                    Rules:
                    1. Remove any template variables like {{city}}
                    2. Remove descriptive text (e.g. "where companies", "is situated")
                    3. Ensure street number, name and type are present
                    4. Add city, state and zip if known
                    5. Use standard USPS abbreviations
                    6. Return None if address is invalid or incomplete
                    
                    Return ONLY the corrected address or None.
                    Examples:
                    "123 Main St, Houston, TX 77002"
                    "1000 Park Ave, New York, NY 10028"
                    None
                    """
                }]
            )
            
            cleaned = response.content[0].text.strip().strip('"')
            if cleaned.lower() == 'none' or '{' in cleaned:
                return None
            return cleaned
            
        except Exception as e:
            logger.warning(f"Claude API error: {str(e)}")
            return None

    def clean_data(self) -> None:
        logger.info("=" * 50)
        logger.info("Starting REIT data cleaning process")
        logger.info("=" * 50)
        
        logger.info(f"Loading data from {self.input_file}")
        with open(self.input_file, 'r') as f:
            data = json.load(f)
        logger.info(f"Loaded {len(data['properties'])} properties")
        
        df = pd.DataFrame(data['properties'])
        logger.info(f"Initial dataframe shape: {df.shape}")
        
        # Address cleaning
        logger.info("Starting address cleaning...")
        df['clean_address'] = df['address'].apply(lambda x: 
            logger.debug(f"Cleaning address: {x}") or self.clean_address(x))
        logger.info(f"Addresses cleaned. Valid addresses: {df['clean_address'].notna().sum()}/{len(df)}")
        
        # Duplicate removal
        pre_dedup = len(df)
        df = df.sort_values('clean_address').drop_duplicates(
            subset=['clean_address', 'company'],
            keep='first'
        )
        logger.info(f"Removed {pre_dedup - len(df)} duplicate entries")
        
        # Geocoding progress
        missing_coords = df[pd.isna(df['latitude']) | pd.isna(df['longitude'])]
        total_to_geocode = len(missing_coords)
        logger.info(f"Starting geocoding for {total_to_geocode} addresses")
        
        for idx, (i, row) in enumerate(missing_coords.iterrows(), 1):
            logger.info(f"Geocoding [{idx}/{total_to_geocode}]: {row['clean_address']}")
            lat, lon = self.geocode_address(row['clean_address'])
            if lat and lon:
                df.at[i, 'latitude'] = lat
                df.at[i, 'longitude'] = lon
                logger.info(f"✓ Successfully geocoded: {row['clean_address']} -> ({lat}, {lon})")
            else:
                logger.warning(f"✗ Failed to geocode: {row['clean_address']}")
        
        # Claude enrichment logging
        missing_coords = df[pd.isna(df['latitude']) | pd.isna(df['longitude'])]
        total_to_enrich = len(missing_coords)
        logger.info(f"Starting Claude enrichment for {total_to_enrich} addresses")
        
        for idx, (i, row) in enumerate(missing_coords.iterrows(), 1):
            logger.info(f"Enriching [{idx}/{total_to_enrich}]: {row['clean_address']}")
            enriched = self.enrich_address_with_claude(
                row['clean_address'],
                row['company'],
                row['market']
            )
            if enriched:
                logger.info(f"✓ Claude enriched: {row['clean_address']} -> {enriched}")
            else:
                logger.warning(f"✗ Claude failed to enrich: {row['clean_address']}")
        
        # Final stats
        logger.info("=" * 50)
        logger.info("Cleaning process completed")
        logger.info(f"Original properties: {len(data['properties'])}")
        logger.info(f"Final properties: {len(df)}")
        logger.info(f"Properties with coordinates: {df['latitude'].notna().sum()}")
        logger.info(f"Success rate: {(df['latitude'].notna().sum()/len(df))*100:.1f}%")
        logger.info("=" * 50)

def main():
    cleaner = REITCleaner("reit_properties.json", "reit_properties_cleaned.json")
    cleaner.clean_data()

if __name__ == "__main__":
    main()
