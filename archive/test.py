import csv

def check_trade_success(csv_file):
    successful_trades = []

    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        transactions = {}  # Dictionary to store transactions grouped by reference number

        for row in reader:
            ref_number = row['REF #']
            if ref_number not in transactions:
                transactions[ref_number] = []
            transactions[ref_number].append(row)

        for ref_number, rows in transactions.items():
            bought_rows = [row for row in rows if 'BOT' in row['DESCRIPTION']]
            sold_rows = [row for row in rows if 'SOLD' in row['DESCRIPTION']]

            for bought_row in bought_rows:
                for sold_row in sold_rows:
                    if float(bought_row['BALANCE'].replace(',', '')) < float(sold_row['BALANCE'].replace(',', '')):
                        successful_trades.append((bought_row, sold_row))

    return successful_trades

csv_file = 'data.csv'  # Change this to your CSV file path
successful_trades = check_trade_success(csv_file)

for buy_row, sell_row in successful_trades:
    print("Successful Trade:")
    print("Buy Row:", buy_row)
    print("Sell Row:", sell_row)
    print()
