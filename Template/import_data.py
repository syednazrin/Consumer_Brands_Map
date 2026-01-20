import pandas as pd

# Import the CSV file as a DataFrame
df = pd.read_csv('mrdiy-com-2025-10-15.csv')

# Display basic information about the DataFrame
print("DataFrame Shape:", df.shape)
print("\nColumn Names:")
print(df.columns.tolist())
print("\nFirst few rows:")
print(df.head())
print("\nData types:")
print(df.dtypes)
print("\nBasic statistics:")
print(df.describe())

# Display the DataFrame
print("\nFull DataFrame:")
print(df)
