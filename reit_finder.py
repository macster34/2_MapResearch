import time
import json
import logging
import aiohttp
import asyncio
import os
from typing import List, Dict
from dataclasses import dataclass
from geopy.geocoders import Nominatim
from dotenv import load_dotenv
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('reit_finder.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class REITProperty:
    address: str
    company: str
    property_type: str = None
    square_footage: str = None
    year_built: str = None
    latitude: float = None
    longitude: float = None
    source_url: str = None
    market: str = None

class REITAddressFinder:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("TAVILY_API_KEY")
        if not self.api_key:
            raise ValueError("TAVILY_API_KEY not found in environment variables")
        
        self.tavily_url = "https://api.tavily.com/search"
        self.geolocator = Nominatim(user_agent="reit_property_finder", timeout=10)
        
        # Statistics tracking
        self.stats = {
            "searches_performed": 0,
            "addresses_found": 0,
            "successful_geocodes": 0,
            "start_time": time.time()
        }
        
        self.reit_companies = [
            "Equinix",
            "Digital Realty",
            "Prologis",
            "Public Storage",
            "Simon Property Group"
        ]
        
        self.markets = [
            "New York",
            "Los Angeles",
            "Chicago",
            "Houston",
            "Atlanta",
            "Washington DC"
        ]

    async def search_tavily(self, session: aiohttp.ClientSession, query: str, company: str, market: str) -> Dict:
        """Execute a search using Tavily API with enhanced logging"""
        self.stats["searches_performed"] += 1
        current_time = time.time()
        elapsed_minutes = (current_time - self.stats["start_time"]) / 60
        
        logger.info(f"Search #{self.stats['searches_performed']} ({elapsed_minutes:.1f} min elapsed)")
        logger.info(f"Company: {company}, Market: {market}")
        logger.info(f"Query: {query[:100]}...")

        params = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": True,
            "max_results": 10
        }
        
        try:
            async with session.post(self.tavily_url, json=params, ssl=False) as response:
                if response.status == 200:
                    data = await response.json()
                    results_count = len(data.get('results', []))
                    logger.info(f"Found {results_count} results")
                    return data
                else:
                    logger.error(f"Tavily API error: {response.status}")
                    return {}
        except Exception as e:
            logger.error(f"Request error: {str(e)}")
            return {}

    async def find_properties(self) -> List[REITProperty]:
        """Main method to find REIT properties with progress tracking"""
        all_properties = []
        total_searches = len(self.reit_companies) * len(self.markets) * 3  # 3 queries per company/market
        
        async with aiohttp.ClientSession() as session:
            for company in self.reit_companies:
                for market in self.markets:
                    progress = (self.stats["searches_performed"] / total_searches) * 100
                    logger.info(f"\nProgress: {progress:.1f}%")
                    logger.info(f"Searching for {company} properties in {market}")
                    
                    search_queries = [
                        f"site:{company.lower().replace(' ', '')}.com {market} data center address location",
                        f"{company} {market} property portfolio addresses",
                        f"{company} {market} real estate properties locations"
                    ]
                    
                    for query in search_queries:
                        try:
                            response = await self.search_tavily(session, query, company, market)
                            if 'results' in response:
                                properties = self._extract_property_info(
                                    response['results'],
                                    company,
                                    market
                                )
                                all_properties.extend(properties)
                            await asyncio.sleep(2)  # Rate limiting
                        except Exception as e:
                            logger.error(f"Error searching {query}: {e}")
        
        return self._deduplicate_properties(all_properties)

    def _extract_property_info(self, results: List[Dict], company: str, market: str) -> List[REITProperty]:
        """Extract property information from search results with enhanced logging"""
        import re
        properties = []
        
        for result in results:
            content = result.get('content', '').lower()
            url = result.get('url', '')
            
            # Address patterns
            address_patterns = [
                r'\d{1,5}\s+[A-Za-z0-9\s\-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)[.,\s]+(?:[A-Za-z\s]+,\s*)?[A-Z]{2}\s+\d{5}',
                r'\d{1,5}\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)[.,\s]+[A-Za-z\s]+,\s*[A-Z]{2}',
                r'(?<=located at\s)\d{1,5}\s+[A-Za-z0-9\s\-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)'
            ]
            
            # Property type patterns
            type_patterns = [
                r'(?:data center|office building|warehouse|storage facility|retail center|shopping mall)',
                r'(?:industrial|commercial|residential)\s+(?:property|building|facility)'
            ]
            
            # Square footage patterns
            sqft_patterns = [
                r'(\d{1,3}(?:,\d{3})*)\s*(?:square feet|sq ft|sqft)',
                r'(\d+)\s*SF'
            ]
            
            # Extract addresses
            for pattern in address_patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    address = match.group(0).strip()
                    self.stats["addresses_found"] += 1
                    
                    logger.info(f"Found address #{self.stats['addresses_found']}: {address}")
                    
                    # Extract property type
                    property_type = None
                    for type_pattern in type_patterns:
                        type_match = re.search(type_pattern, content, re.IGNORECASE)
                        if type_match:
                            property_type = type_match.group(0)
                            break
                    
                    # Extract square footage
                    square_footage = None
                    for sqft_pattern in sqft_patterns:
                        sqft_match = re.search(sqft_pattern, content, re.IGNORECASE)
                        if sqft_match:
                            square_footage = sqft_match.group(1)
                            break
                    
                    # Create property object
                    property = REITProperty(
                        address=address,
                        company=company,
                        property_type=property_type,
                        square_footage=square_footage,
                        source_url=url,
                        market=market
                    )
                    
                    # Geocode the address
                    try:
                        location = self.geolocator.geocode(address)
                        if location:
                            property.latitude = location.latitude
                            property.longitude = location.longitude
                            self.stats["successful_geocodes"] += 1
                            logger.info(f"Successfully geocoded: {address}")
                        else:
                            logger.warning(f"Could not geocode: {address}")
                    except Exception as e:
                        logger.warning(f"Geocoding error for {address}: {e}")
                    
                    properties.append(property)
        
        return properties

    def _deduplicate_properties(self, properties: List[REITProperty]) -> List[REITProperty]:
        """Remove duplicate properties based on address"""
        seen_addresses = set()
        unique_properties = []
        
        for prop in properties:
            if prop.address not in seen_addresses:
                seen_addresses.add(prop.address)
                unique_properties.append(prop)
        
        logger.info(f"Deduplicated {len(properties)} properties to {len(unique_properties)} unique properties")
        return unique_properties

    def save_results(self, properties: List[REITProperty], filename: str):
        """Save results with metadata"""
        end_time = time.time()
        duration = (end_time - self.stats["start_time"]) / 60
        
        data = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "duration_minutes": duration,
                "stats": self.stats,
                "total_properties": len(properties)
            },
            "properties": [
                {
                    "address": p.address,
                    "company": p.company,
                    "market": p.market,
                    "property_type": p.property_type,
                    "square_footage": p.square_footage,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "source_url": p.source_url
                }
                for p in properties
            ]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"\nResults saved to {filename}")
        logger.info(f"Total runtime: {duration:.1f} minutes")
        logger.info(f"Total properties found: {len(properties)}")
        logger.info(f"Searches performed: {self.stats['searches_performed']}")
        logger.info(f"Successful geocodes: {self.stats['successful_geocodes']}")

async def main():
    try:
        finder = REITAddressFinder()
        properties = await finder.find_properties()
        finder.save_results(properties, "reit_properties.json")
        
        # Print summary by company and market
        print("\nProperties by Company:")
        company_counts = {}
        market_counts = {}
        
        for prop in properties:
            company_counts[prop.company] = company_counts.get(prop.company, 0) + 1
            market_counts[prop.market] = market_counts.get(prop.market, 0) + 1
        
        for company, count in company_counts.items():
            print(f"{company}: {count}")
        
        print("\nProperties by Market:")
        for market, count in market_counts.items():
            print(f"{market}: {count}")
            
    except Exception as e:
        logger.error(f"Error in main execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())
