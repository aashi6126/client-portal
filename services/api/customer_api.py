import sqlite3
from flask import Flask, jsonify
from flask_cors import CORS, cross_origin
import logging
logging.basicConfig(level=logging.DEBUG)
from flask import request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from dateutil.parser import parse

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite://///Users/aman/workspaces/client-portal/services/customer.db'
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
db = SQLAlchemy(app)
CORS(app, origins=['http://localhost:3000'])

# Create a session factory
Session = sessionmaker(bind=engine)

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
    Product = db.Column(db.String(500))
    Client_Manager = db.Column(db.String(500))
    Renewal_Date = db.Column(db.Date)

@app.route('/api/customers', methods=['POST'])
def add_customer():
    session = Session()
    data = request.get_json()
    
    def parse_date(date_str):
        try:
            return parse(date_str).date() if date_str else None
        except ValueError:
            return None

    try:
        for customer_data in data:
            new_customer = Customer(
                Other_Broker=customer_data.get('Other_Broker'),
                Group_Name=customer_data.get('Group_Name'),
                Contact_Person=customer_data.get('Contact_Person'),
                Email=customer_data.get('Email'),
                Phone_Number=customer_data.get('Phone_Number'),
                Funding=customer_data.get('Funding'),
                Current_Carrier=customer_data.get('Current_Carrier'),
                Num_Employees_At_Renewal=customer_data.get('Num_Employees_At_Renewal'),
                Waiting_Period=customer_data.get('Waiting_Period'),
                Deductible_Accumulation=customer_data.get('Deductible_Accumulation'),
                Previous_Carrier=customer_data.get('Previous_Carrier'),
                Cobra_Carrier=customer_data.get('Cobra_Carrier'),
                Dental_Effective_Date=parse_date(customer_data.get('Dental_Effective_Date')),
                Dental_Carrier=customer_data.get('Dental_Carrier'),
                Vision_Effective_Date=parse_date(customer_data.get('Vision_Effective_Date')),
                Vision_Carrier=customer_data.get('Vision_Carrier'),
                Life_And_ADND_Effective_Date=parse_date(customer_data.get('Life_And_ADND_Effective_Date')),
                Life_And_ADND_Carrier=customer_data.get('Life_And_ADND_Carrier'),
                LTD_Effective_Date=parse_date(customer_data.get('LTD_Effective_Date')),
                LTD_Carrier=customer_data.get('LTD_Carrier'),
                STD_Effective_Date=parse_date(customer_data.get('STD_Effective_Date')),
                STD_Carrier=customer_data.get('STD_Carrier'),
                Effective_Date_401K=parse_date(customer_data.get('Effective_Date_401K')),
                Carrier_401K=customer_data.get('Carrier_401K'),
                Employer=customer_data.get('Employer'),
                Employee=customer_data.get('Employee'),
                PNC=customer_data.get('PNC'),
                Employee_Navigator=customer_data.get('Employee_Navigator'),
                Product=customer_data.get('Product'),
                Client_Manager=customer_data.get('Client_Manager')
            )
            session.add(new_customer)
        session.commit()
        return jsonify({'message': 'New customer added successfully', 'customer_id': new_customer.Customer_id}), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/customers/<int:Customer_id>', methods=['PUT'])
def update_customers(Customer_id):
    session = Session()
    try:
        customer = request.get_json()
        print("customer: ", customer)

        def parse_date(date_str):
            try:
                return parse(date_str).date() if date_str else None
            except ValueError:
                return None

        session.query(Customer).filter(Customer.Customer_id == Customer_id).update({
            Customer.Renewal_Date: parse_date(customer.get('Renewal_Date')),
            Customer.Other_Broker: customer.get('Other_Broker'),
            Customer.Group_Name: customer.get('Group_Name'),
            Customer.Contact_Person: customer.get('Contact_Person'),
            Customer.Email: customer.get('Email'),
            Customer.Phone_Number: customer.get('Phone_Number'),
            Customer.Funding: customer.get('Funding'),
            Customer.Current_Carrier: customer.get('Current_Carrier'),
            Customer.Num_Employees_At_Renewal: customer.get('Num_Employees_At_Renewal'),
            Customer.Waiting_Period: customer.get('Waiting_Period'),
            Customer.Deductible_Accumulation: customer.get('Deductible_Accumulation'),
            Customer.Previous_Carrier: customer.get('Previous_Carrier'),
            Customer.Cobra_Carrier: customer.get('Cobra_Carrier'),
            Customer.Dental_Effective_Date: parse_date(customer.get('Dental_Effective_Date')),
            Customer.Dental_Carrier: customer.get('Dental_Carrier'),
            Customer.Vision_Effective_Date: parse_date(customer.get('Vision_Effective_Date')),
            Customer.Vision_Carrier: customer.get('Vision_Carrier'),
            Customer.Life_And_ADND_Effective_Date: parse_date(customer.get('Life_And_ADND_Effective_Date')),
            Customer.Life_And_ADND_Carrier: customer.get('Life_And_ADND_Carrier'),
            Customer.LTD_Effective_Date: parse_date(customer.get('LTD_Effective_Date')),
            Customer.LTD_Carrier: customer.get('LTD_Carrier'),
            Customer.STD_Effective_Date: parse_date(customer.get('STD_Effective_Date')),
            Customer.STD_Carrier: customer.get('STD_Carrier'),
            Customer.Effective_Date_401K: parse_date(customer.get('Effective_Date_401K')),
            Customer.Carrier_401K: customer.get('Carrier_401K'),
            Customer.Employer: customer.get('Employer'),
            Customer.Employee: customer.get('Employee'),
            Customer.PNC: customer.get('PNC'),
            Customer.Employee_Navigator: customer.get('Employee_Navigator'),
            Customer.Product: customer.get('Product'),
            Customer.Client_Manager: customer.get('Client_Manager')
        })

        session.commit()
        return jsonify({'message': 'Customer updated successfully'}), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        session.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        session.close()


@app.route('/api/customers/<int:Customer_id>', methods=['DELETE'])
def delete_customer(Customer_id):
    session = Session()
    try:
        customer = session.get(Customer, Customer_id)
        if not customer:
            return jsonify({'message': 'Customer not found'}), 404

        session.delete(customer)
        session.commit()
        return jsonify({'message': 'Customer deleted successfully'}), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        session.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        session.close()

@app.route('/api/customers', methods=['GET'])
def get_customers(page=1, page_size=5000):
    session = Session()
    try:
        customers = session.query(Customer).all()
        rows = [(c.Renewal_Date, c.Other_Broker, c.Group_Name, c.Contact_Person, c.Email, c.Phone_Number, c.Funding, c.Current_Carrier, c.Num_Employees_At_Renewal, c.Waiting_Period, c.Deductible_Accumulation, c.Previous_Carrier, c.Cobra_Carrier, c.Dental_Effective_Date, c.Dental_Carrier, c.Vision_Effective_Date, c.Vision_Carrier, c.Life_And_ADND_Effective_Date, c.Life_And_ADND_Carrier, c.LTD_Effective_Date, c.LTD_Carrier, c.STD_Effective_Date, c.STD_Carrier, c.Effective_Date_401K, c.Carrier_401K, c.Employer, c.Employee, c.PNC, c.Employee_Navigator, c.Product, c.Client_Manager, c.Customer_id) for c in customers]

        all_customers = [{
            'Renewal_Date': row[0].strftime('%Y-%m-%d') if row[0] else None,
            'Other_Broker': row[1],
            'Group_Name': row[2],
            'Contact_Person': row[3],
            'Email': row[4],
            'Phone_Number': row[5],
            'Funding': row[6],
            'Current_Carrier': row[7],
            'Num_Employees_At_Renewal': row[8],
            'Waiting_Period': row[9],
            'Deductible_Accumulation': row[10],
            'Previous_Carrier': row[11],
            'Cobra_Carrier': row[12],
            'Dental_Effective_Date': row[13].strftime('%Y-%m-%d') if row[13] else None,
            'Dental_Carrier': row[14],
            'Vision_Effective_Date': row[15].strftime('%Y-%m-%d') if row[15] else None,
            'Vision_Carrier': row[16],
            'Life_And_ADND_Effective_Date': row[17].strftime('%Y-%m-%d') if row[17] else None,
            'Life_And_ADND_Carrier': row[18],
            'LTD_Effective_Date': row[19].strftime('%Y-%m-%d') if row[19] else None,
            'LTD_Carrier': row[20],
            'STD_Effective_Date': row[21].strftime('%Y-%m-%d') if row[21] else None,
            'STD_Carrier': row[22],
            'Effective_Date_401K': row[23].strftime('%Y-%m-%d') if row[23] else None,
            'Carrier_401K': row[24],
            'Employer': row[25],
            'Employee': row[26],
            'PNC': row[27],
            'Employee_Navigator': row[28],
            'Product': row[29],
            'Client_Manager': row[30] if row[31] else None,
            'Customer_id': row[31] 
        } for row in rows]

        start = (page - 1) * page_size
        end = start + page_size 
        customers_page = all_customers[start:end]
        total_customers = len(all_customers)
        total_pages = (total_customers + page_size - 1) // page_size
        
        response = {
            'customers': customers_page,
            'total_customers': total_customers,
            'total_pages': total_pages,
            'current_page': page
        }
        return jsonify(response), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        session.close()

@app.route('/api/customers/<int:customer_id>/clone', methods=['POST'])
def clone_customer(customer_id):
    session = Session()
    try:
        customer = session.get(Customer, customer_id)
        if not customer:
            return jsonify({'message': 'Customer not found'}), 404

        cloned_customer = Customer(
            Other_Broker=customer.Other_Broker,
            Group_Name=customer.Group_Name,
            Contact_Person=customer.Contact_Person,
            Email=customer.Email,
            Phone_Number=customer.Phone_Number,
            Funding=customer.Funding,
            Current_Carrier=customer.Current_Carrier,
            Num_Employees_At_Renewal=customer.Num_Employees_At_Renewal,
            Waiting_Period=customer.Waiting_Period,
            Deductible_Accumulation=customer.Deductible_Accumulation,
            Previous_Carrier=customer.Previous_Carrier,
            Cobra_Carrier=customer.Cobra_Carrier,
            Dental_Effective_Date=customer.Dental_Effective_Date,
            Dental_Carrier=customer.Dental_Carrier,
            Vision_Effective_Date=customer.Vision_Effective_Date,
            Vision_Carrier=customer.Vision_Carrier,
            Life_And_ADND_Effective_Date=customer.Life_And_ADND_Effective_Date,
            Life_And_ADND_Carrier=customer.Life_And_ADND_Carrier,
            LTD_Effective_Date=customer.LTD_Effective_Date,
            LTD_Carrier=customer.LTD_Carrier,
            STD_Effective_Date=customer.STD_Effective_Date,
            STD_Carrier=customer.STD_Carrier,
            Effective_Date_401K=customer.Effective_Date_401K,
            Carrier_401K=customer.Carrier_401K,
            Employer=customer.Employer,
            Employee=customer.Employee,
            PNC=customer.PNC,
            Employee_Navigator=customer.Employee_Navigator,
            Product=customer.Product,
            Client_Manager=customer.Client_Manager,
            Renewal_Date=customer.Renewal_Date
        )
        session.add(cloned_customer)
        session.commit()
        return jsonify({'message': 'Customer cloned successfully', 'customer_id': cloned_customer.Customer_id}), 201

    except Exception as e:
        print(f"An error occurred: {e}")
        session.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        session.close()

@app.route('/api/customers/purge', methods=['DELETE'])
def purge_customers():
    session = Session()
    try:
        # Delete all customers
        logging.info("Deleting all customers")
        session.query(Customer).delete()
        session.commit()
        return jsonify({'message': 'All customers deleted successfully'}), 200

    except Exception as e:
        print(f"An error occurred: {e}")
        session.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        session.close()

if __name__ == '__main__':
    app.run(debug=True)