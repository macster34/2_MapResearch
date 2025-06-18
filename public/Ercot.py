import json
import random
from datetime import datetime

def main():
    # Generate sample ERCOT data
    registration_date = datetime.now()
    
    # Generate realistic sample data
    output_data = {
        'data': []
    }
    
    # Generate 10 data points with realistic values
    for _ in range(10):
        data_point = {
            'date': registration_date.strftime("%Y-%m-%d"),
            'hour': registration_date.hour,
            'mw': round(random.uniform(50, 200), 1),  # Power consumption between 50-200 MW
            'price': round(random.uniform(20, 200), 2)  # Price between $20-$200 per MWh
        }
        output_data['data'].append(data_point)
    
    # Print a single, valid JSON object
    print(json.dumps(output_data))

if __name__ == "__main__":
    main()
