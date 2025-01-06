from flask import Flask, jsonify
from flask_cors import CORS, cross_origin
import sqlite3
import logging
logging.basicConfig(level=logging.DEBUG)
from flask import request
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////Users/aashisharma/projects/client_portal/client-portal/services/customer.db'
db = SQLAlchemy(app)
CORS(app, origins=['http://localhost:3000'])
# CORS(app)  # This will enable CORS for all routes

class Customer(db.Model):
    Customer_id = db.Column(db.Integer, primary_key=True)
    Other_Broker = db.Column(db.String(500))
    Group_Name = db.Column(db.String(500))
    Contact_Person = db.Column(db.String(500))
    Email = db.Column(db.String(500))
    Phone_Number = db.Column(db.String(500))
    Funding = db.Column(db.String(500))
    Current_Carrier = db.Column(db.String(500))
    Num_Employees_At_Renewal = db.Column(db.Integer)
    Waiting_Period = db.Column(db.String(500))
    Deductible_Accumulation = db.Column(db.String(500))
    Previous_Carrier = db.Column(db.String(500))
    Cobra_Carrier = db.Column(db.String(500))
    Dental_Effective_Date = db.Column(db.Date)
    Dental_Carrier = db.Column(db.String(500))
    Vision_Effective_Date = db.Column(db.Date)
    Vision_Carrier = db.Column(db.String(500))
    Life_And_ADND_Effective_Date = db.Column(db.Date)
    Life_And_ADND_Carrier = db.Column(db.String(500))
    LTD_Effective_Date = db.Column(db.Date)
    LTD_Carrier = db.Column(db.String(500))
    STD_Effective_Date = db.Column(db.Date)
    STD_Carrier = db.Column(db.String(500))
    Effective_Date_401K = db.Column(db.Date)
    Carrier_401K = db.Column(db.String(500))
    Employer = db.Column(db.String(500))
    Employee = db.Column(db.String(500))
    PNC = db.Column(db.String(500))
    Employee_Navigator = db.Column(db.String(500))
    product = db.Column(db.String(500))



approute = '/api/customers'
@app.route(approute, methods=['GET'])
def get_customers(page=1, page_size=5000):
    
    conn = sqlite3.connect('/Users/aashisharma/projects/client_portal/client-portal/services/customer.db')
    cursor = conn.cursor()

    cursor.execute("SELECT Renewal_Date, Other_Broker, Group_Name, Contact_Person, Email, Phone_Number, Funding, Current_Carrier, Num_Employees_At_Renewal, Waiting_Period, Deductible_Accumulation, Previous_Carrier, Cobra_Carrier, Dental_Effective_Date, Dental_Carrier, Vision_Effective_Date, Vision_Carrier, Life_And_ADND_Effective_Date, Life_And_ADND_Carrier, LTD_Effective_Date, LTD_Carrier, STD_Effective_Date, STD_Carrier, Effective_Date_401K, Carrier_401K, Employer, Employee, PNC, Employee_Navigator, Product, Customer_id FROM customer")
    rows = cursor.fetchall()

    all_customers = [{'Renewal_Date': row[0], 'Other_Broker': row[1], 'Group_Name': row[2], 'Contact_Person': row[3], 'Email': row[4], 'Phone_Number': row[5], 'Funding': row[6], 'Current_Carrier': row[7], 'Num_Employees_At_Renewal': row[8], 'Waiting_Period': row[9], 'Deductible_Accumulation': row[10], 'Previous_Carrier': row[11], 'Cobra_Carrier': row[12], 'Dental_Effective_Date': row[13], 'Dental_Carrier': row[14], 'Vision_Effective_Date': row[15], 'Vision_Carrier': row[16], 'Life_And_ADND_Effective_Date': row[17], 'Life_And_ADND_Carrier': row[18], 'LTD_Effective_Date': row[19], 'LTD_Carrier': row[20], 'STD_Effective_Date': row[21], 'STD_Carrier': row[22], 'Effective_Date_401K': row[23], 'Carrier_401K': row[24], 'Employer': row[25], 'Employee': row[26], 'PNC': row[27], 'Employee_Navigator': row[28], 'Product':row[29], 'Customer_id': row[30]} for row in rows]

    start = (page - 1) * page_size
    end = start + page_size 
    customers_page = all_customers[start:end]
    total_customers = len(all_customers)
    total_pages = (total_customers + page_size - 1) // page_size
    
    response = {
        "customers": customers_page,
        "page": page,
        "page_size": page_size,
        "total_customers": total_customers,
        "total_pages": total_pages
    }

    return jsonify(response)


approute = '/api/customers'
@app.route(approute + '/<int:Customer_id>', methods=['PUT'])
def update_customers(Customer_id):
    try: 
        conn = sqlite3.connect('/Users/aashisharma/projects/client_portal/client-portal/services/customer.db')
        
        cursor = conn.cursor()
        customer = request.get_json()

        cursor.execute("""
            UPDATE customer
            SET Renewal_Date = ?, Other_Broker = ?, Group_Name = ?, Contact_Person = ?, Email = ?, Phone_Number = ?, Funding = ?, Current_Carrier = ?, Num_Employees_At_Renewal = ?, Waiting_Period = ?, Deductible_Accumulation = ?, Previous_Carrier = ?, Cobra_Carrier = ?, Dental_Effective_Date = ?, Dental_Carrier = ?, Vision_Effective_Date = ?, Vision_Carrier = ?, Life_And_ADND_Effective_Date = ?, Life_And_ADND_Carrier = ?, LTD_Effective_Date = ?, LTD_Carrier = ?, STD_Effective_Date = ?, STD_Carrier = ?, Effective_Date_401K = ?, Carrier_401K = ?, Employer = ?, Employee = ?, PNC = ?, Employee_Navigator = ?, Product = ?
            WHERE Customer_id = ?
        """, (customer['Renewal_Date'], customer['Other_Broker'], customer['Group_Name'], customer['Contact_Person'], customer['Email'], customer['Phone_Number'], customer['Funding'], customer['Current_Carrier'], customer['Num_Employees_At_Renewal'], customer['Waiting_Period'], customer['Deductible_Accumulation'], customer['Previous_Carrier'], customer['Cobra_Carrier'], customer['Dental_Effective_Date'], customer['Dental_Carrier'], customer['Vision_Effective_Date'], customer['Vision_Carrier'], customer['Life_And_ADND_Effective_Date'], customer['Life_And_ADND_Carrier'], customer['LTD_Effective_Date'], customer['LTD_Carrier'], customer['STD_Effective_Date'], customer['STD_Carrier'], customer['Effective_Date_401K'], customer['Carrier_401K'], customer['Employer'], customer['Employee'], customer['PNC'], customer['Employee_Navigator'], customer['Product'], Customer_id))

        conn.commit()
        print("Customer updated successfully")
        return jsonify({'message': 'Customer updated successfully'}), 200
    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()



approute = '/api/customers'
@app.route(approute + '/<int:Customer_id>', methods=['DELETE'])
def delete_customer(Customer_id):
    try:
        conn = sqlite3.connect('/Users/aashisharma/projects/client_portal/client-portal/services/customer.db')
        cursor = conn.cursor()
        delete_query = """ DELETE FROM customer WHERE Customer_id = ? """
        cursor.execute(delete_query, (Customer_id,))
        conn.commit()
        print("Customer deleted successfully")
        return jsonify({'message': 'Customer deleted successfully'}), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()

@app.route(approute + '/<int:customer_id>/clone', methods=['POST'])
@app.route(approute + '/<int:customer_id>/clone', methods=['POST'])
def clone_customer(customer_id):
    print("cloning customer with id: ", customer_id)
    conn = None
    cursor = None
    try:
        conn = sqlite3.connect('/Users/aashisharma/projects/client_portal/client-portal/services/customer.db')
        cursor = conn.cursor()

        # Get the customer data
        cursor.execute("SELECT * FROM customer WHERE customer_id = ?", (customer_id,))
        customer = cursor.fetchone()

        if not customer:
            return jsonify({'message': 'Customer not found'}), 404

        # Create a copy of the customer data, excluding the id
        cloned_customer = customer[1:]

        # Insert the cloned customer data into the database
        placeholders = ', '.join(['?'] * len(cloned_customer))
        cursor.execute(f"INSERT INTO customer VALUES (NULL, {placeholders})", cloned_customer)
        conn.commit()

        return jsonify({'message': 'Customer cloned successfully', 'customer_id': cursor.lastrowid}), 201

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == '__main__':
    app.run(debug=True)
    