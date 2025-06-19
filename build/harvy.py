import json
import pandas as pd
import numpy as np
from collections import Counter
from datetime import datetime

def load_and_clean_data(filepath):
    """Load GeoJSON and perform initial data cleaning"""
    print("\n=== Loading and Cleaning Data ===")
    
    # Load data
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # Convert list of dictionaries to DataFrame
    df = pd.json_normalize(data)
    
    # Print data structure info
    print("\nData Structure:")
    print(f"Number of columns: {len(df.columns)}")
    print("\nColumns found:")
    for col in sorted(df.columns):
        print(f"- {col} ({df[col].dtype})")
    
    # Basic data quality checks
    total_records = len(df)
    null_counts = df.isnull().sum()
    
    # Check for duplicates excluding list columns
    list_columns = []
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, list)).any():
            list_columns.append(col)
    
    print("\nColumns containing lists:")
    print(list_columns)
    
    non_list_columns = [col for col in df.columns if col not in list_columns]
    duplicates = df[non_list_columns].duplicated().sum()
    
    print(f"\nInitial Data Quality:")
    print(f"Total Records: {total_records}")
    print(f"Duplicate Records (excluding list columns): {duplicates}")
    print("\nMissing Values by Field:")
    print(null_counts[null_counts > 0])
    
    # Print sample of numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    print("\nNumeric Columns Summary:")
    print(df[numeric_cols].describe())
    
    return df, list_columns

def analyze_spatial_distribution(df):
    """Analyze spatial distribution of measurements"""
    print("\n=== Spatial Distribution Analysis ===")
    
    # Count by waterbody
    if 'waterbody' in df.columns:
        waterbody_counts = df['waterbody'].value_counts()
        print("\nMeasurements by Waterbody (top 10):")
        print(waterbody_counts.head(10))
    
    # Geographic bounds
    if 'latitude_dd' in df.columns and 'longitude_dd' in df.columns:
        print("\nGeographic Bounds:")
        print(f"Latitude Range: {df['latitude_dd'].min():.4f} to {df['latitude_dd'].max():.4f}")
        print(f"Longitude Range: {df['longitude_dd'].min():.4f} to {df['longitude_dd'].max():.4f}")
    
    # Sample density by county
    if 'county' in df.columns:
        print("\nMeasurements by County:")
        print(df['county'].value_counts())

def analyze_flood_heights(df):
    """Analyze flood height measurements"""
    print("\n=== Flood Height Analysis ===")
    
    if 'peak_stage' in df.columns:
        # Overall statistics
        print("\nOverall Peak Stage Statistics (feet):")
        peak_stats = df['peak_stage'].describe()
        print(peak_stats)
        
        # Statistics by environment
        if 'hwm_environment' in df.columns:
            print("\nPeak Stage by Environment Type:")
            env_stats = df.groupby('hwm_environment')['peak_stage'].agg(['count', 'mean', 'min', 'max'])
            print(env_stats)
        
        # Identify extreme values
        print("\nTop 5 Highest Peak Stages:")
        cols_to_show = ['waterbody', 'peak_stage', 'description']
        cols_to_show = [col for col in cols_to_show if col in df.columns]
        highest = df.nlargest(5, 'peak_stage')[cols_to_show]
        print(highest)

def analyze_temporal_distribution(df):
    """Analyze temporal distribution of measurements"""
    print("\n=== Temporal Analysis ===")
    
    if 'peak_date' in df.columns:
        try:
            # Convert peak_date to datetime
            df['peak_date'] = pd.to_datetime(df['peak_date'])
            
            # Get date range
            date_range = df['peak_date'].agg(['min', 'max'])
            print("\nMeasurement Date Range:")
            print(f"First Measurement: {date_range['min']}")
            print(f"Last Measurement: {date_range['max']}")
            
            # Measurements by date
            daily_counts = df['peak_date'].dt.date.value_counts().sort_index()
            print("\nMeasurements by Date:")
            print(daily_counts)
        except Exception as e:
            print(f"Error processing dates: {str(e)}")

def analyze_data_quality(df, list_columns):
    """Analyze data quality metrics"""
    print("\n=== Data Quality Metrics ===")
    
    # Check measurement quality
    if 'hwm_quality_id' in df.columns:
        print("\nMeasurement Quality Distribution:")
        print(df['hwm_quality_id'].value_counts())
    
    # Check measurement types
    if 'hwm_type_id' in df.columns:
        print("\nMeasurement Type Distribution:")
        print(df['hwm_type_id'].value_counts())
    
    # Check collection methods
    if 'hcollect_method_id' in df.columns:
        print("\nCollection Method Distribution:")
        print(df['hcollect_method_id'].value_counts())
    
    # Print value counts for categorical columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    excluded_cols = ['description', 'hwm_notes'] + list_columns
    
    for col in categorical_cols:
        if col not in excluded_cols:
            try:
                unique_count = df[col].nunique()
                if unique_count < 10:
                    print(f"\n{col} Distribution:")
                    print(df[col].value_counts())
            except TypeError:
                continue

def main():
    try:
        # Load and clean data
        df, list_columns = load_and_clean_data('remote/public/harvy2.geojson')
        
        # Run analyses
        analyze_spatial_distribution(df)
        analyze_flood_heights(df)
        analyze_temporal_distribution(df)
        analyze_data_quality(df, list_columns)
        
        print("\nAnalysis complete!")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print("\nFull traceback:")
        print(traceback.format_exc())

if __name__ == "__main__":
    main()
