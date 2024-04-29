from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

@app.route('/api/customers', methods=['GET'])
def get_customers():
    conn = sqlite3.connect('customer.db')  # replace with your SQLite database name
    cursor = conn.cursor()

    cursor.execute("SELECT Customer_id, email, contact_person FROM customer")  # replace 'customers' with your table name
    rows = cursor.fetchall()

    # Assuming your table has columns 'id', 'name', and 'email'
    customers = [{'Customer_id': row[0], 'Email': row[1], 'Contact_person': row[2]} for row in rows]

    return jsonify(customers)

if __name__ == '__main__':
    app.run(debug=True)


