import requests
from datetime import datetime, timedelta
import json
import os
import urllib.parse

class ErcotAPI:
    def __init__(self):
        self.base_url = "https://api.ercot.com/api/public-reports"
        self.auth_url = "https://ercotb2c.b2clogin.com/ercotb2c.onmicrosoft.com/B2C_1_PUBAPI-ROPC-FLOW/oauth2/v2.0/token"
        # Using provided API keys
        self.primary_key = "c3e287185f85482aa85f651165cef97b"
        self.secondary_key = "7da2e0f7543e4c1fab5db33d188fcfd8"
        
        # Get ID token
        self.id_token = self._get_id_token()
        if self.id_token:
            print("Successfully obtained ID token")
        
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": self.primary_key,
            "Authorization": f"Bearer {self.id_token}" if self.id_token else None
        }

    def _get_id_token(self):
        """Get ID token from B2C endpoint"""
        data = {
            "username": "titel.y@gmail.com",
            "password": "79Wn7@GG$EY$6k8",
            "grant_type": "password",
            "scope": "openid fec253ea-0d06-4272-a5e6-b478baeecd70 offline_access",
            "client_id": "fec253ea-0d06-4272-a5e6-b478baeecd70",
            "response_type": "id_token"
        }
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        
        try:
            print("\nGetting ID token...")
            response = requests.post(self.auth_url, data=data, headers=headers)
            
            if response.status_code == 200:
                token_data = response.json()
                print("Successfully obtained token")
                return token_data.get('access_token')
            else:
                print(f"Failed to get token. Status: {response.status_code}")
                print(f"Response: {response.text}")
            return None
        except Exception as e:
            print(f"Error getting ID token: {str(e)}")
            return None

    def get_version(self):
        """Test endpoint to get API version information"""
        endpoint = f"{self.base_url}/version"
        try:
            print("\nTesting version endpoint...")
            print(f"URL: {endpoint}")
            
            response = requests.get(endpoint, headers=self.headers)
            print(f"Response status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error response: {response.text}")
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            print(f"Error: {str(e)}")
            return None

    def get_ecrsm_data(self, delivery_date_from=None, delivery_date_to=None, 
                       hour_ending_from=None, hour_ending_to=None,
                       mw_offered_from=None, mw_offered_to=None,
                       price_from=None, price_to=None,
                       page=None, size=None, sort=None, dir=None):
        """Get 2D Aggregated AS Offers ECRSM data"""
        endpoint = f"{self.base_url}/np3-911-er/2d_agg_as_offers_ecrsm"
        
        # Build query parameters
        params = {}
        if delivery_date_from:
            params['deliveryDateFrom'] = delivery_date_from
        if delivery_date_to:
            params['deliveryDateTo'] = delivery_date_to
        if hour_ending_from:
            params['hourEndingFrom'] = hour_ending_from
        if hour_ending_to:
            params['hourEndingTo'] = hour_ending_to
        if mw_offered_from:
            params['MWOfferedFrom'] = mw_offered_from
        if mw_offered_to:
            params['MWOfferedTo'] = mw_offered_to
        if price_from:
            params['ECRSMOfferPriceFrom'] = price_from
        if price_to:
            params['ECRSMOfferPriceTo'] = price_to
        if page:
            params['page'] = page
        if size:
            params['size'] = size
        if sort:
            params['sort'] = sort
        if dir:
            params['dir'] = dir

        try:
            print("\nGetting ECRSM data...")
            response = requests.get(endpoint, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error: Status code {response.status_code}")
                print(f"Response: {response.text}")
            return None
        except Exception as e:
            print(f"Error getting ECRSM data: {str(e)}")
            return None

def main():
    # Create API instance
    ercot = ErcotAPI()
    
    # Test ECRSM data endpoint with dates around registration
    print("\nTesting ECRSM data endpoint...")
    registration_date = datetime(2025, 2, 15)  # Your registration date
    start_date = (registration_date - timedelta(days=7)).strftime("%Y-%m-%d")
    end_date = (registration_date + timedelta(days=7)).strftime("%Y-%m-%d")
    
    print(f"Using date range: {start_date} to {end_date}")
    
    ecrsm_data = ercot.get_ecrsm_data(
        delivery_date_from=start_date,
        delivery_date_to=end_date,
        size=1000  # Increased to get more data
    )
    
    if ecrsm_data and ecrsm_data.get('data'):
        print("\nData Analysis:")
        
        # Group data by date and hour
        data_by_hour = {}
        for point in ecrsm_data['data']:
            date = point[0]
            hour = point[1]
            mw = point[2]
            price = point[3]
            
            key = f"{date} Hour {hour}"
            if key not in data_by_hour:
                data_by_hour[key] = {
                    'min_price': float('inf'),
                    'max_price': float('-inf'),
                    'total_mw': 0,
                    'offers': []
                }
            
            data_by_hour[key]['min_price'] = min(data_by_hour[key]['min_price'], price)
            data_by_hour[key]['max_price'] = max(data_by_hour[key]['max_price'], price)
            data_by_hour[key]['total_mw'] += mw
            data_by_hour[key]['offers'].append((mw, price))
        
        # Print summary
        print("\nHourly Summary:")
        for time_slot, data in sorted(data_by_hour.items()):
            print(f"\n{time_slot}:")
            print(f"  Total MW: {data['total_mw']:.1f}")
            print(f"  Price Range: ${data['min_price']:.2f} - ${data['max_price']:.2f}")
            print("  Offers (MW @ Price):")
            for mw, price in sorted(data['offers'], key=lambda x: x[1]):  # Sort by price
                print(f"    {mw:.1f} MW @ ${price:.2f}")
        
        print(f"\nTotal records: {ecrsm_data['_meta']['totalRecords']}")
    else:
        print("\nNo data points found in the response")

if __name__ == "__main__":
    main()
