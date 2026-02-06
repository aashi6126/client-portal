import os
import io
import logging
from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, func, or_
from dateutil.parser import parse
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

# ===========================================================================
# CORS CONFIGURATION
# ===========================================================================
def is_allowed_origin(origin):
    """Check if origin is allowed."""
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    if origin in allowed_origins:
        return True
    # Allow any devtunnels.ms subdomain
    if origin and origin.endswith('.use.devtunnels.ms'):
        return True
    return False

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin and is_allowed_origin(origin):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# ===========================================================================
# DATABASE CONFIGURATION
# ===========================================================================
db_uri = os.environ.get('DATABASE_URI', 'sqlite://///Users/aman/workspaces/client-portal/services/customer.db')
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
db = SQLAlchemy(app)
Session = sessionmaker(bind=engine)

# ===========================================================================
# DATABASE MODELS
# ===========================================================================

class Client(db.Model):
    __tablename__ = 'clients'

    id = db.Column(db.Integer, primary_key=True)
    tax_id = db.Column(db.String(50), unique=True, nullable=False)
    client_name = db.Column(db.String(200))
    contact_person = db.Column(db.String(200))
    email = db.Column(db.String(200))
    phone_number = db.Column(db.String(50))
    address_line_1 = db.Column(db.String(200))
    address_line_2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee_benefits = db.relationship('EmployeeBenefit', back_populates='client', cascade='all, delete-orphan')
    commercial_insurance = db.relationship('CommercialInsurance', back_populates='client', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'tax_id': self.tax_id,
            'client_name': self.client_name,
            'contact_person': self.contact_person,
            'email': self.email,
            'phone_number': self.phone_number,
            'address_line_1': self.address_line_1,
            'address_line_2': self.address_line_2,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code
        }


class EmployeeBenefit(db.Model):
    __tablename__ = 'employee_benefits'

    id = db.Column(db.Integer, primary_key=True)
    tax_id = db.Column(db.String(50), db.ForeignKey('clients.tax_id'), nullable=False)

    # Core fields
    form_fire_code = db.Column(db.String(100))
    enrollment_poc = db.Column(db.String(200))
    renewal_date = db.Column(db.Date)
    funding = db.Column(db.String(100))
    current_carrier = db.Column(db.String(200))
    num_employees_at_renewal = db.Column(db.Integer)
    waiting_period = db.Column(db.String(100))
    deductible_accumulation = db.Column(db.String(100))
    previous_carrier = db.Column(db.String(200))
    cobra_carrier = db.Column(db.String(200))
    employer_contribution = db.Column(db.String(50))
    employee_contribution = db.Column(db.String(50))

    # Dental
    dental_renewal_date = db.Column(db.Date)
    dental_carrier = db.Column(db.String(200))

    # Vision
    vision_renewal_date = db.Column(db.Date)
    vision_carrier = db.Column(db.String(200))

    # Life & AD&D
    life_adnd_renewal_date = db.Column(db.Date)
    life_adnd_carrier = db.Column(db.String(200))

    # LTD
    ltd_renewal_date = db.Column(db.Date)
    ltd_carrier = db.Column(db.String(200))

    # STD
    std_renewal_date = db.Column(db.Date)
    std_carrier = db.Column(db.String(200))

    # 401K
    k401_renewal_date = db.Column(db.Date)
    k401_carrier = db.Column(db.String(200))

    # Critical Illness
    critical_illness_renewal_date = db.Column(db.Date)
    critical_illness_carrier = db.Column(db.String(200))

    # Accident
    accident_renewal_date = db.Column(db.Date)
    accident_carrier = db.Column(db.String(200))

    # Hospital
    hospital_renewal_date = db.Column(db.Date)
    hospital_carrier = db.Column(db.String(200))

    # Voluntary Life
    voluntary_life_renewal_date = db.Column(db.Date)
    voluntary_life_carrier = db.Column(db.String(200))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    client = db.relationship('Client', back_populates='employee_benefits')

    def to_dict(self):
        return {
            'id': self.id,
            'tax_id': self.tax_id,
            'client_name': self.client.client_name if self.client else None,
            'form_fire_code': self.form_fire_code,
            'enrollment_poc': self.enrollment_poc,
            'renewal_date': self.renewal_date.isoformat() if self.renewal_date else None,
            'funding': self.funding,
            'current_carrier': self.current_carrier,
            'num_employees_at_renewal': self.num_employees_at_renewal,
            'waiting_period': self.waiting_period,
            'deductible_accumulation': self.deductible_accumulation,
            'previous_carrier': self.previous_carrier,
            'cobra_carrier': self.cobra_carrier,
            'employer_contribution': self.employer_contribution,
            'employee_contribution': self.employee_contribution,
            'dental_renewal_date': self.dental_renewal_date.isoformat() if self.dental_renewal_date else None,
            'dental_carrier': self.dental_carrier,
            'vision_renewal_date': self.vision_renewal_date.isoformat() if self.vision_renewal_date else None,
            'vision_carrier': self.vision_carrier,
            'life_adnd_renewal_date': self.life_adnd_renewal_date.isoformat() if self.life_adnd_renewal_date else None,
            'life_adnd_carrier': self.life_adnd_carrier,
            'ltd_renewal_date': self.ltd_renewal_date.isoformat() if self.ltd_renewal_date else None,
            'ltd_carrier': self.ltd_carrier,
            'std_renewal_date': self.std_renewal_date.isoformat() if self.std_renewal_date else None,
            'std_carrier': self.std_carrier,
            'k401_renewal_date': self.k401_renewal_date.isoformat() if self.k401_renewal_date else None,
            'k401_carrier': self.k401_carrier,
            'critical_illness_renewal_date': self.critical_illness_renewal_date.isoformat() if self.critical_illness_renewal_date else None,
            'critical_illness_carrier': self.critical_illness_carrier,
            'accident_renewal_date': self.accident_renewal_date.isoformat() if self.accident_renewal_date else None,
            'accident_carrier': self.accident_carrier,
            'hospital_renewal_date': self.hospital_renewal_date.isoformat() if self.hospital_renewal_date else None,
            'hospital_carrier': self.hospital_carrier,
            'voluntary_life_renewal_date': self.voluntary_life_renewal_date.isoformat() if self.voluntary_life_renewal_date else None,
            'voluntary_life_carrier': self.voluntary_life_carrier
        }


class CommercialInsurance(db.Model):
    __tablename__ = 'commercial_insurance'

    id = db.Column(db.Integer, primary_key=True)
    tax_id = db.Column(db.String(50), db.ForeignKey('clients.tax_id'), nullable=False)

    # Core fields
    remarks = db.Column(db.Text)
    status = db.Column(db.String(50))

    # 1. Commercial General Liability
    general_liability_carrier = db.Column(db.String(200))
    general_liability_limit = db.Column(db.String(100))
    general_liability_premium = db.Column(db.Numeric(12, 2))
    general_liability_renewal_date = db.Column(db.Date)

    # 2. Commercial Property
    property_carrier = db.Column(db.String(200))
    property_limit = db.Column(db.String(100))
    property_premium = db.Column(db.Numeric(12, 2))
    property_renewal_date = db.Column(db.Date)

    # 3. Business Owners Policy (BOP)
    bop_carrier = db.Column(db.String(200))
    bop_limit = db.Column(db.String(100))
    bop_premium = db.Column(db.Numeric(12, 2))
    bop_renewal_date = db.Column(db.Date)

    # 4. Umbrella Liability
    umbrella_carrier = db.Column(db.String(200))
    umbrella_limit = db.Column(db.String(100))
    umbrella_premium = db.Column(db.Numeric(12, 2))
    umbrella_renewal_date = db.Column(db.Date)

    # 5. Workers Compensation
    workers_comp_carrier = db.Column(db.String(200))
    workers_comp_limit = db.Column(db.String(100))
    workers_comp_premium = db.Column(db.Numeric(12, 2))
    workers_comp_renewal_date = db.Column(db.Date)

    # 6. Professional or E&O
    professional_eo_carrier = db.Column(db.String(200))
    professional_eo_limit = db.Column(db.String(100))
    professional_eo_premium = db.Column(db.Numeric(12, 2))
    professional_eo_renewal_date = db.Column(db.Date)

    # 7. Cyber Liability
    cyber_carrier = db.Column(db.String(200))
    cyber_limit = db.Column(db.String(100))
    cyber_premium = db.Column(db.Numeric(12, 2))
    cyber_renewal_date = db.Column(db.Date)

    # 8. Commercial Auto
    auto_carrier = db.Column(db.String(200))
    auto_limit = db.Column(db.String(100))
    auto_premium = db.Column(db.Numeric(12, 2))
    auto_renewal_date = db.Column(db.Date)

    # 9. EPLI
    epli_carrier = db.Column(db.String(200))
    epli_limit = db.Column(db.String(100))
    epli_premium = db.Column(db.Numeric(12, 2))
    epli_renewal_date = db.Column(db.Date)

    # 10. NYDBL
    nydbl_carrier = db.Column(db.String(200))
    nydbl_limit = db.Column(db.String(100))
    nydbl_premium = db.Column(db.Numeric(12, 2))
    nydbl_renewal_date = db.Column(db.Date)

    # 11. Surety Bond
    surety_carrier = db.Column(db.String(200))
    surety_limit = db.Column(db.String(100))
    surety_premium = db.Column(db.Numeric(12, 2))
    surety_renewal_date = db.Column(db.Date)

    # 12. Product Liability
    product_liability_carrier = db.Column(db.String(200))
    product_liability_limit = db.Column(db.String(100))
    product_liability_premium = db.Column(db.Numeric(12, 2))
    product_liability_renewal_date = db.Column(db.Date)

    # 13. Flood
    flood_carrier = db.Column(db.String(200))
    flood_limit = db.Column(db.String(100))
    flood_premium = db.Column(db.Numeric(12, 2))
    flood_renewal_date = db.Column(db.Date)

    # 14. Crime or Fidelity Bond
    crime_carrier = db.Column(db.String(200))
    crime_limit = db.Column(db.String(100))
    crime_premium = db.Column(db.Numeric(12, 2))
    crime_renewal_date = db.Column(db.Date)

    # 15. Directors & Officers
    directors_officers_carrier = db.Column(db.String(200))
    directors_officers_limit = db.Column(db.String(100))
    directors_officers_premium = db.Column(db.Numeric(12, 2))
    directors_officers_renewal_date = db.Column(db.Date)

    # 16. Fiduciary Bond
    fiduciary_carrier = db.Column(db.String(200))
    fiduciary_limit = db.Column(db.String(100))
    fiduciary_premium = db.Column(db.Numeric(12, 2))
    fiduciary_renewal_date = db.Column(db.Date)

    # 17. Inland Marine
    inland_marine_carrier = db.Column(db.String(200))
    inland_marine_limit = db.Column(db.String(100))
    inland_marine_premium = db.Column(db.Numeric(12, 2))
    inland_marine_renewal_date = db.Column(db.Date)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    client = db.relationship('Client', back_populates='commercial_insurance')

    def to_dict(self):
        def format_premium(val):
            return float(val) if val else None

        return {
            'id': self.id,
            'tax_id': self.tax_id,
            'client_name': self.client.client_name if self.client else None,
            'remarks': self.remarks,
            'status': self.status,
            'general_liability_carrier': self.general_liability_carrier,
            'general_liability_limit': self.general_liability_limit,
            'general_liability_premium': format_premium(self.general_liability_premium),
            'general_liability_renewal_date': self.general_liability_renewal_date.isoformat() if self.general_liability_renewal_date else None,
            'property_carrier': self.property_carrier,
            'property_limit': self.property_limit,
            'property_premium': format_premium(self.property_premium),
            'property_renewal_date': self.property_renewal_date.isoformat() if self.property_renewal_date else None,
            'bop_carrier': self.bop_carrier,
            'bop_limit': self.bop_limit,
            'bop_premium': format_premium(self.bop_premium),
            'bop_renewal_date': self.bop_renewal_date.isoformat() if self.bop_renewal_date else None,
            'umbrella_carrier': self.umbrella_carrier,
            'umbrella_limit': self.umbrella_limit,
            'umbrella_premium': format_premium(self.umbrella_premium),
            'umbrella_renewal_date': self.umbrella_renewal_date.isoformat() if self.umbrella_renewal_date else None,
            'workers_comp_carrier': self.workers_comp_carrier,
            'workers_comp_limit': self.workers_comp_limit,
            'workers_comp_premium': format_premium(self.workers_comp_premium),
            'workers_comp_renewal_date': self.workers_comp_renewal_date.isoformat() if self.workers_comp_renewal_date else None,
            'professional_eo_carrier': self.professional_eo_carrier,
            'professional_eo_limit': self.professional_eo_limit,
            'professional_eo_premium': format_premium(self.professional_eo_premium),
            'professional_eo_renewal_date': self.professional_eo_renewal_date.isoformat() if self.professional_eo_renewal_date else None,
            'cyber_carrier': self.cyber_carrier,
            'cyber_limit': self.cyber_limit,
            'cyber_premium': format_premium(self.cyber_premium),
            'cyber_renewal_date': self.cyber_renewal_date.isoformat() if self.cyber_renewal_date else None,
            'auto_carrier': self.auto_carrier,
            'auto_limit': self.auto_limit,
            'auto_premium': format_premium(self.auto_premium),
            'auto_renewal_date': self.auto_renewal_date.isoformat() if self.auto_renewal_date else None,
            'epli_carrier': self.epli_carrier,
            'epli_limit': self.epli_limit,
            'epli_premium': format_premium(self.epli_premium),
            'epli_renewal_date': self.epli_renewal_date.isoformat() if self.epli_renewal_date else None,
            'nydbl_carrier': self.nydbl_carrier,
            'nydbl_limit': self.nydbl_limit,
            'nydbl_premium': format_premium(self.nydbl_premium),
            'nydbl_renewal_date': self.nydbl_renewal_date.isoformat() if self.nydbl_renewal_date else None,
            'surety_carrier': self.surety_carrier,
            'surety_limit': self.surety_limit,
            'surety_premium': format_premium(self.surety_premium),
            'surety_renewal_date': self.surety_renewal_date.isoformat() if self.surety_renewal_date else None,
            'product_liability_carrier': self.product_liability_carrier,
            'product_liability_limit': self.product_liability_limit,
            'product_liability_premium': format_premium(self.product_liability_premium),
            'product_liability_renewal_date': self.product_liability_renewal_date.isoformat() if self.product_liability_renewal_date else None,
            'flood_carrier': self.flood_carrier,
            'flood_limit': self.flood_limit,
            'flood_premium': format_premium(self.flood_premium),
            'flood_renewal_date': self.flood_renewal_date.isoformat() if self.flood_renewal_date else None,
            'crime_carrier': self.crime_carrier,
            'crime_limit': self.crime_limit,
            'crime_premium': format_premium(self.crime_premium),
            'crime_renewal_date': self.crime_renewal_date.isoformat() if self.crime_renewal_date else None,
            'directors_officers_carrier': self.directors_officers_carrier,
            'directors_officers_limit': self.directors_officers_limit,
            'directors_officers_premium': format_premium(self.directors_officers_premium),
            'directors_officers_renewal_date': self.directors_officers_renewal_date.isoformat() if self.directors_officers_renewal_date else None,
            'fiduciary_carrier': self.fiduciary_carrier,
            'fiduciary_limit': self.fiduciary_limit,
            'fiduciary_premium': format_premium(self.fiduciary_premium),
            'fiduciary_renewal_date': self.fiduciary_renewal_date.isoformat() if self.fiduciary_renewal_date else None,
            'inland_marine_carrier': self.inland_marine_carrier,
            'inland_marine_limit': self.inland_marine_limit,
            'inland_marine_premium': format_premium(self.inland_marine_premium),
            'inland_marine_renewal_date': self.inland_marine_renewal_date.isoformat() if self.inland_marine_renewal_date else None
        }

# ===========================================================================
# UTILITY FUNCTIONS
# ===========================================================================

def parse_date(date_str):
    """Parse date string to date object."""
    if not date_str or date_str == '':
        return None
    try:
        return parse(date_str).date()
    except:
        return None


# ===========================================================================
# CLIENT ENDPOINTS
# ===========================================================================

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Get all clients."""
    session = Session()
    try:
        clients = session.query(Client).all()
        return jsonify({
            'clients': [client.to_dict() for client in clients],
            'total': len(clients)
        }), 200
    except Exception as e:
        logging.error(f"Error fetching clients: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/clients', methods=['POST'])
def create_client():
    """Create a new client."""
    session = Session()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        client = Client(
            tax_id=data.get('tax_id'),
            client_name=data.get('client_name'),
            contact_person=data.get('contact_person'),
            email=data.get('email'),
            phone_number=data.get('phone_number'),
            address_line_1=data.get('address_line_1'),
            address_line_2=data.get('address_line_2'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code')
        )

        session.add(client)
        session.commit()

        return jsonify({
            'message': 'Client created successfully',
            'client': client.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        logging.error(f"Error creating client: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/clients/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    """Update a client."""
    session = Session()
    try:
        client = session.query(Client).filter_by(id=client_id).first()
        if not client:
            return jsonify({'error': 'Client not found'}), 404

        data = request.get_json()

        client.tax_id = data.get('tax_id', client.tax_id)
        client.client_name = data.get('client_name', client.client_name)
        client.contact_person = data.get('contact_person', client.contact_person)
        client.email = data.get('email', client.email)
        client.phone_number = data.get('phone_number', client.phone_number)
        client.address_line_1 = data.get('address_line_1', client.address_line_1)
        client.address_line_2 = data.get('address_line_2', client.address_line_2)
        client.city = data.get('city', client.city)
        client.state = data.get('state', client.state)
        client.zip_code = data.get('zip_code', client.zip_code)

        session.commit()

        return jsonify({
            'message': 'Client updated successfully',
            'client': client.to_dict()
        }), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error updating client: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Delete a client."""
    session = Session()
    try:
        client = session.query(Client).filter_by(id=client_id).first()
        if not client:
            return jsonify({'error': 'Client not found'}), 404

        session.delete(client)
        session.commit()

        return jsonify({'message': 'Client deleted successfully'}), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error deleting client: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/clients/<int:client_id>/clone', methods=['POST'])
def clone_client(client_id):
    """Clone a client."""
    session = Session()
    try:
        original = session.query(Client).filter_by(id=client_id).first()
        if not original:
            return jsonify({'error': 'Client not found'}), 404

        # Create new client with copied data
        new_client = Client(
            tax_id=original.tax_id + '_COPY',
            client_name=original.client_name + ' (Copy)',
            contact_person=original.contact_person,
            email=original.email,
            phone_number=original.phone_number,
            address_line_1=original.address_line_1,
            address_line_2=original.address_line_2,
            city=original.city,
            state=original.state,
            zip_code=original.zip_code
        )

        session.add(new_client)
        session.commit()

        return jsonify({
            'message': 'Client cloned successfully',
            'client': new_client.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        logging.error(f"Error cloning client: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ===========================================================================
# EMPLOYEE BENEFITS ENDPOINTS
# ===========================================================================

@app.route('/api/benefits', methods=['GET'])
def get_benefits():
    """Get all employee benefits with client info."""
    session = Session()
    try:
        benefits = session.query(EmployeeBenefit).all()
        return jsonify({
            'benefits': [benefit.to_dict() for benefit in benefits],
            'total': len(benefits)
        }), 200
    except Exception as e:
        logging.error(f"Error fetching benefits: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/benefits/<int:benefit_id>', methods=['GET'])
def get_benefit(benefit_id):
    """Get a single benefit record."""
    session = Session()
    try:
        benefit = session.query(EmployeeBenefit).filter_by(id=benefit_id).first()
        if not benefit:
            return jsonify({'error': 'Benefit not found'}), 404
        return jsonify(benefit.to_dict()), 200
    except Exception as e:
        logging.error(f"Error fetching benefit: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/benefits', methods=['POST'])
def create_benefit():
    """Create new employee benefit record."""
    session = Session()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        benefit = EmployeeBenefit(
            tax_id=data.get('tax_id'),
            form_fire_code=data.get('form_fire_code'),
            enrollment_poc=data.get('enrollment_poc'),
            renewal_date=parse_date(data.get('renewal_date')),
            funding=data.get('funding'),
            current_carrier=data.get('current_carrier'),
            num_employees_at_renewal=data.get('num_employees_at_renewal'),
            waiting_period=data.get('waiting_period'),
            deductible_accumulation=data.get('deductible_accumulation'),
            previous_carrier=data.get('previous_carrier'),
            cobra_carrier=data.get('cobra_carrier'),
            employer_contribution=data.get('employer_contribution'),
            employee_contribution=data.get('employee_contribution'),
            dental_renewal_date=parse_date(data.get('dental_renewal_date')),
            dental_carrier=data.get('dental_carrier'),
            vision_renewal_date=parse_date(data.get('vision_renewal_date')),
            vision_carrier=data.get('vision_carrier'),
            life_adnd_renewal_date=parse_date(data.get('life_adnd_renewal_date')),
            life_adnd_carrier=data.get('life_adnd_carrier'),
            ltd_renewal_date=parse_date(data.get('ltd_renewal_date')),
            ltd_carrier=data.get('ltd_carrier'),
            std_renewal_date=parse_date(data.get('std_renewal_date')),
            std_carrier=data.get('std_carrier'),
            k401_renewal_date=parse_date(data.get('k401_renewal_date')),
            k401_carrier=data.get('k401_carrier'),
            critical_illness_renewal_date=parse_date(data.get('critical_illness_renewal_date')),
            critical_illness_carrier=data.get('critical_illness_carrier'),
            accident_renewal_date=parse_date(data.get('accident_renewal_date')),
            accident_carrier=data.get('accident_carrier'),
            hospital_renewal_date=parse_date(data.get('hospital_renewal_date')),
            hospital_carrier=data.get('hospital_carrier'),
            voluntary_life_renewal_date=parse_date(data.get('voluntary_life_renewal_date')),
            voluntary_life_carrier=data.get('voluntary_life_carrier')
        )

        session.add(benefit)
        session.commit()

        return jsonify({
            'message': 'Benefit created successfully',
            'benefit': benefit.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        logging.error(f"Error creating benefit: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/benefits/<int:benefit_id>', methods=['PUT'])
def update_benefit(benefit_id):
    """Update employee benefit record."""
    session = Session()
    try:
        benefit = session.query(EmployeeBenefit).filter_by(id=benefit_id).first()
        if not benefit:
            return jsonify({'error': 'Benefit not found'}), 404

        data = request.get_json()

        # Update all fields
        benefit.tax_id = data.get('tax_id', benefit.tax_id)
        benefit.form_fire_code = data.get('form_fire_code', benefit.form_fire_code)
        benefit.enrollment_poc = data.get('enrollment_poc', benefit.enrollment_poc)
        benefit.renewal_date = parse_date(data.get('renewal_date')) if 'renewal_date' in data else benefit.renewal_date
        benefit.funding = data.get('funding', benefit.funding)
        benefit.current_carrier = data.get('current_carrier', benefit.current_carrier)
        benefit.num_employees_at_renewal = data.get('num_employees_at_renewal', benefit.num_employees_at_renewal)
        benefit.waiting_period = data.get('waiting_period', benefit.waiting_period)
        benefit.deductible_accumulation = data.get('deductible_accumulation', benefit.deductible_accumulation)
        benefit.previous_carrier = data.get('previous_carrier', benefit.previous_carrier)
        benefit.cobra_carrier = data.get('cobra_carrier', benefit.cobra_carrier)
        benefit.employer_contribution = data.get('employer_contribution', benefit.employer_contribution)
        benefit.employee_contribution = data.get('employee_contribution', benefit.employee_contribution)

        # Update benefit plans
        if 'dental_renewal_date' in data:
            benefit.dental_renewal_date = parse_date(data.get('dental_renewal_date'))
        if 'dental_carrier' in data:
            benefit.dental_carrier = data.get('dental_carrier')
        if 'vision_renewal_date' in data:
            benefit.vision_renewal_date = parse_date(data.get('vision_renewal_date'))
        if 'vision_carrier' in data:
            benefit.vision_carrier = data.get('vision_carrier')
        if 'life_adnd_renewal_date' in data:
            benefit.life_adnd_renewal_date = parse_date(data.get('life_adnd_renewal_date'))
        if 'life_adnd_carrier' in data:
            benefit.life_adnd_carrier = data.get('life_adnd_carrier')
        if 'ltd_renewal_date' in data:
            benefit.ltd_renewal_date = parse_date(data.get('ltd_renewal_date'))
        if 'ltd_carrier' in data:
            benefit.ltd_carrier = data.get('ltd_carrier')
        if 'std_renewal_date' in data:
            benefit.std_renewal_date = parse_date(data.get('std_renewal_date'))
        if 'std_carrier' in data:
            benefit.std_carrier = data.get('std_carrier')
        if 'k401_renewal_date' in data:
            benefit.k401_renewal_date = parse_date(data.get('k401_renewal_date'))
        if 'k401_carrier' in data:
            benefit.k401_carrier = data.get('k401_carrier')
        if 'critical_illness_renewal_date' in data:
            benefit.critical_illness_renewal_date = parse_date(data.get('critical_illness_renewal_date'))
        if 'critical_illness_carrier' in data:
            benefit.critical_illness_carrier = data.get('critical_illness_carrier')
        if 'accident_renewal_date' in data:
            benefit.accident_renewal_date = parse_date(data.get('accident_renewal_date'))
        if 'accident_carrier' in data:
            benefit.accident_carrier = data.get('accident_carrier')
        if 'hospital_renewal_date' in data:
            benefit.hospital_renewal_date = parse_date(data.get('hospital_renewal_date'))
        if 'hospital_carrier' in data:
            benefit.hospital_carrier = data.get('hospital_carrier')
        if 'voluntary_life_renewal_date' in data:
            benefit.voluntary_life_renewal_date = parse_date(data.get('voluntary_life_renewal_date'))
        if 'voluntary_life_carrier' in data:
            benefit.voluntary_life_carrier = data.get('voluntary_life_carrier')

        session.commit()

        return jsonify({
            'message': 'Benefit updated successfully',
            'benefit': benefit.to_dict()
        }), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error updating benefit: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/benefits/<int:benefit_id>', methods=['DELETE'])
def delete_benefit(benefit_id):
    """Delete employee benefit record."""
    session = Session()
    try:
        benefit = session.query(EmployeeBenefit).filter_by(id=benefit_id).first()
        if not benefit:
            return jsonify({'error': 'Benefit not found'}), 404

        session.delete(benefit)
        session.commit()

        return jsonify({'message': 'Benefit deleted successfully'}), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error deleting benefit: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/benefits/<int:benefit_id>/clone', methods=['POST'])
def clone_benefit(benefit_id):
    """Clone employee benefit record."""
    session = Session()
    try:
        original = session.query(EmployeeBenefit).filter_by(id=benefit_id).first()
        if not original:
            return jsonify({'error': 'Benefit not found'}), 404

        new_benefit = EmployeeBenefit(
            tax_id=original.tax_id,
            form_fire_code=original.form_fire_code,
            enrollment_poc=original.enrollment_poc,
            renewal_date=original.renewal_date,
            funding=original.funding,
            current_carrier=original.current_carrier,
            num_employees_at_renewal=original.num_employees_at_renewal,
            waiting_period=original.waiting_period,
            deductible_accumulation=original.deductible_accumulation,
            previous_carrier=original.previous_carrier,
            cobra_carrier=original.cobra_carrier,
            employer_contribution=original.employer_contribution,
            employee_contribution=original.employee_contribution,
            dental_renewal_date=original.dental_renewal_date,
            dental_carrier=original.dental_carrier,
            vision_renewal_date=original.vision_renewal_date,
            vision_carrier=original.vision_carrier,
            life_adnd_renewal_date=original.life_adnd_renewal_date,
            life_adnd_carrier=original.life_adnd_carrier,
            ltd_renewal_date=original.ltd_renewal_date,
            ltd_carrier=original.ltd_carrier,
            std_renewal_date=original.std_renewal_date,
            std_carrier=original.std_carrier,
            k401_renewal_date=original.k401_renewal_date,
            k401_carrier=original.k401_carrier,
            critical_illness_renewal_date=original.critical_illness_renewal_date,
            critical_illness_carrier=original.critical_illness_carrier,
            accident_renewal_date=original.accident_renewal_date,
            accident_carrier=original.accident_carrier,
            hospital_renewal_date=original.hospital_renewal_date,
            hospital_carrier=original.hospital_carrier,
            voluntary_life_renewal_date=original.voluntary_life_renewal_date,
            voluntary_life_carrier=original.voluntary_life_carrier
        )

        session.add(new_benefit)
        session.commit()

        return jsonify({
            'message': 'Benefit cloned successfully',
            'benefit': new_benefit.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        logging.error(f"Error cloning benefit: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ===========================================================================
# COMMERCIAL INSURANCE ENDPOINTS
# ===========================================================================

@app.route('/api/commercial', methods=['GET'])
def get_commercial():
    """Get all commercial insurance records with client info."""
    session = Session()
    try:
        commercial = session.query(CommercialInsurance).all()
        return jsonify({
            'commercial': [c.to_dict() for c in commercial],
            'total': len(commercial)
        }), 200
    except Exception as e:
        logging.error(f"Error fetching commercial: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/commercial/<int:commercial_id>', methods=['GET'])
def get_commercial_single(commercial_id):
    """Get a single commercial insurance record."""
    session = Session()
    try:
        commercial = session.query(CommercialInsurance).filter_by(id=commercial_id).first()
        if not commercial:
            return jsonify({'error': 'Commercial insurance not found'}), 404
        return jsonify(commercial.to_dict()), 200
    except Exception as e:
        logging.error(f"Error fetching commercial: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/commercial', methods=['POST'])
def create_commercial():
    """Create new commercial insurance record."""
    session = Session()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        commercial = CommercialInsurance(
            tax_id=data.get('tax_id'),
            remarks=data.get('remarks'),
            status=data.get('status'),
            # General Liability
            general_liability_carrier=data.get('general_liability_carrier'),
            general_liability_limit=data.get('general_liability_limit'),
            general_liability_premium=data.get('general_liability_premium'),
            general_liability_renewal_date=parse_date(data.get('general_liability_renewal_date')),
            # Property
            property_carrier=data.get('property_carrier'),
            property_limit=data.get('property_limit'),
            property_premium=data.get('property_premium'),
            property_renewal_date=parse_date(data.get('property_renewal_date')),
            # BOP
            bop_carrier=data.get('bop_carrier'),
            bop_limit=data.get('bop_limit'),
            bop_premium=data.get('bop_premium'),
            bop_renewal_date=parse_date(data.get('bop_renewal_date')),
            # Umbrella
            umbrella_carrier=data.get('umbrella_carrier'),
            umbrella_limit=data.get('umbrella_limit'),
            umbrella_premium=data.get('umbrella_premium'),
            umbrella_renewal_date=parse_date(data.get('umbrella_renewal_date')),
            # Workers Comp
            workers_comp_carrier=data.get('workers_comp_carrier'),
            workers_comp_limit=data.get('workers_comp_limit'),
            workers_comp_premium=data.get('workers_comp_premium'),
            workers_comp_renewal_date=parse_date(data.get('workers_comp_renewal_date')),
            # Professional E&O
            professional_eo_carrier=data.get('professional_eo_carrier'),
            professional_eo_limit=data.get('professional_eo_limit'),
            professional_eo_premium=data.get('professional_eo_premium'),
            professional_eo_renewal_date=parse_date(data.get('professional_eo_renewal_date')),
            # Cyber
            cyber_carrier=data.get('cyber_carrier'),
            cyber_limit=data.get('cyber_limit'),
            cyber_premium=data.get('cyber_premium'),
            cyber_renewal_date=parse_date(data.get('cyber_renewal_date')),
            # Auto
            auto_carrier=data.get('auto_carrier'),
            auto_limit=data.get('auto_limit'),
            auto_premium=data.get('auto_premium'),
            auto_renewal_date=parse_date(data.get('auto_renewal_date')),
            # EPLI
            epli_carrier=data.get('epli_carrier'),
            epli_limit=data.get('epli_limit'),
            epli_premium=data.get('epli_premium'),
            epli_renewal_date=parse_date(data.get('epli_renewal_date')),
            # NYDBL
            nydbl_carrier=data.get('nydbl_carrier'),
            nydbl_limit=data.get('nydbl_limit'),
            nydbl_premium=data.get('nydbl_premium'),
            nydbl_renewal_date=parse_date(data.get('nydbl_renewal_date')),
            # Surety
            surety_carrier=data.get('surety_carrier'),
            surety_limit=data.get('surety_limit'),
            surety_premium=data.get('surety_premium'),
            surety_renewal_date=parse_date(data.get('surety_renewal_date')),
            # Product Liability
            product_liability_carrier=data.get('product_liability_carrier'),
            product_liability_limit=data.get('product_liability_limit'),
            product_liability_premium=data.get('product_liability_premium'),
            product_liability_renewal_date=parse_date(data.get('product_liability_renewal_date')),
            # Flood
            flood_carrier=data.get('flood_carrier'),
            flood_limit=data.get('flood_limit'),
            flood_premium=data.get('flood_premium'),
            flood_renewal_date=parse_date(data.get('flood_renewal_date')),
            # Crime
            crime_carrier=data.get('crime_carrier'),
            crime_limit=data.get('crime_limit'),
            crime_premium=data.get('crime_premium'),
            crime_renewal_date=parse_date(data.get('crime_renewal_date')),
            # Directors & Officers
            directors_officers_carrier=data.get('directors_officers_carrier'),
            directors_officers_limit=data.get('directors_officers_limit'),
            directors_officers_premium=data.get('directors_officers_premium'),
            directors_officers_renewal_date=parse_date(data.get('directors_officers_renewal_date')),
            # Fiduciary
            fiduciary_carrier=data.get('fiduciary_carrier'),
            fiduciary_limit=data.get('fiduciary_limit'),
            fiduciary_premium=data.get('fiduciary_premium'),
            fiduciary_renewal_date=parse_date(data.get('fiduciary_renewal_date')),
            # Inland Marine
            inland_marine_carrier=data.get('inland_marine_carrier'),
            inland_marine_limit=data.get('inland_marine_limit'),
            inland_marine_premium=data.get('inland_marine_premium'),
            inland_marine_renewal_date=parse_date(data.get('inland_marine_renewal_date'))
        )

        session.add(commercial)
        session.commit()

        return jsonify({
            'message': 'Commercial insurance created successfully',
            'commercial': commercial.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        logging.error(f"Error creating commercial: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/commercial/<int:commercial_id>', methods=['PUT'])
def update_commercial(commercial_id):
    """Update commercial insurance record."""
    session = Session()
    try:
        commercial = session.query(CommercialInsurance).filter_by(id=commercial_id).first()
        if not commercial:
            return jsonify({'error': 'Commercial insurance not found'}), 404

        data = request.get_json()

        # Update core fields
        commercial.tax_id = data.get('tax_id', commercial.tax_id)
        commercial.remarks = data.get('remarks', commercial.remarks)
        commercial.status = data.get('status', commercial.status)

        # Update all insurance products
        for product in ['general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
                       'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
                       'product_liability', 'flood', 'crime', 'directors_officers',
                       'fiduciary', 'inland_marine']:
            if f'{product}_carrier' in data:
                setattr(commercial, f'{product}_carrier', data.get(f'{product}_carrier'))
            if f'{product}_limit' in data:
                setattr(commercial, f'{product}_limit', data.get(f'{product}_limit'))
            if f'{product}_premium' in data:
                setattr(commercial, f'{product}_premium', data.get(f'{product}_premium'))
            if f'{product}_renewal_date' in data:
                setattr(commercial, f'{product}_renewal_date', parse_date(data.get(f'{product}_renewal_date')))

        session.commit()

        return jsonify({
            'message': 'Commercial insurance updated successfully',
            'commercial': commercial.to_dict()
        }), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error updating commercial: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/commercial/<int:commercial_id>', methods=['DELETE'])
def delete_commercial(commercial_id):
    """Delete commercial insurance record."""
    session = Session()
    try:
        commercial = session.query(CommercialInsurance).filter_by(id=commercial_id).first()
        if not commercial:
            return jsonify({'error': 'Commercial insurance not found'}), 404

        session.delete(commercial)
        session.commit()

        return jsonify({'message': 'Commercial insurance deleted successfully'}), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error deleting commercial: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/commercial/<int:commercial_id>/clone', methods=['POST'])
def clone_commercial(commercial_id):
    """Clone commercial insurance record."""
    session = Session()
    try:
        original = session.query(CommercialInsurance).filter_by(id=commercial_id).first()
        if not original:
            return jsonify({'error': 'Commercial insurance not found'}), 404

        new_commercial = CommercialInsurance(
            tax_id=original.tax_id,
            remarks=original.remarks,
            status=original.status,
            # Copy all product fields
            general_liability_carrier=original.general_liability_carrier,
            general_liability_limit=original.general_liability_limit,
            general_liability_premium=original.general_liability_premium,
            general_liability_renewal_date=original.general_liability_renewal_date,
            property_carrier=original.property_carrier,
            property_limit=original.property_limit,
            property_premium=original.property_premium,
            property_renewal_date=original.property_renewal_date,
            bop_carrier=original.bop_carrier,
            bop_limit=original.bop_limit,
            bop_premium=original.bop_premium,
            bop_renewal_date=original.bop_renewal_date,
            umbrella_carrier=original.umbrella_carrier,
            umbrella_limit=original.umbrella_limit,
            umbrella_premium=original.umbrella_premium,
            umbrella_renewal_date=original.umbrella_renewal_date,
            workers_comp_carrier=original.workers_comp_carrier,
            workers_comp_limit=original.workers_comp_limit,
            workers_comp_premium=original.workers_comp_premium,
            workers_comp_renewal_date=original.workers_comp_renewal_date,
            professional_eo_carrier=original.professional_eo_carrier,
            professional_eo_limit=original.professional_eo_limit,
            professional_eo_premium=original.professional_eo_premium,
            professional_eo_renewal_date=original.professional_eo_renewal_date,
            cyber_carrier=original.cyber_carrier,
            cyber_limit=original.cyber_limit,
            cyber_premium=original.cyber_premium,
            cyber_renewal_date=original.cyber_renewal_date,
            auto_carrier=original.auto_carrier,
            auto_limit=original.auto_limit,
            auto_premium=original.auto_premium,
            auto_renewal_date=original.auto_renewal_date,
            epli_carrier=original.epli_carrier,
            epli_limit=original.epli_limit,
            epli_premium=original.epli_premium,
            epli_renewal_date=original.epli_renewal_date,
            nydbl_carrier=original.nydbl_carrier,
            nydbl_limit=original.nydbl_limit,
            nydbl_premium=original.nydbl_premium,
            nydbl_renewal_date=original.nydbl_renewal_date,
            surety_carrier=original.surety_carrier,
            surety_limit=original.surety_limit,
            surety_premium=original.surety_premium,
            surety_renewal_date=original.surety_renewal_date,
            product_liability_carrier=original.product_liability_carrier,
            product_liability_limit=original.product_liability_limit,
            product_liability_premium=original.product_liability_premium,
            product_liability_renewal_date=original.product_liability_renewal_date,
            flood_carrier=original.flood_carrier,
            flood_limit=original.flood_limit,
            flood_premium=original.flood_premium,
            flood_renewal_date=original.flood_renewal_date,
            crime_carrier=original.crime_carrier,
            crime_limit=original.crime_limit,
            crime_premium=original.crime_premium,
            crime_renewal_date=original.crime_renewal_date,
            directors_officers_carrier=original.directors_officers_carrier,
            directors_officers_limit=original.directors_officers_limit,
            directors_officers_premium=original.directors_officers_premium,
            directors_officers_renewal_date=original.directors_officers_renewal_date,
            fiduciary_carrier=original.fiduciary_carrier,
            fiduciary_limit=original.fiduciary_limit,
            fiduciary_premium=original.fiduciary_premium,
            fiduciary_renewal_date=original.fiduciary_renewal_date,
            inland_marine_carrier=original.inland_marine_carrier,
            inland_marine_limit=original.inland_marine_limit,
            inland_marine_premium=original.inland_marine_premium,
            inland_marine_renewal_date=original.inland_marine_renewal_date
        )

        session.add(new_commercial)
        session.commit()

        return jsonify({
            'message': 'Commercial insurance cloned successfully',
            'commercial': new_commercial.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        logging.error(f"Error cloning commercial: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ===========================================================================
# DASHBOARD ANALYTICS ENDPOINTS
# ===========================================================================

@app.route('/api/dashboard/renewals', methods=['GET'])
def get_dashboard_renewals():
    """Get renewal data for dashboard (next 12 months from both benefits and commercial)."""
    session = Session()
    try:
        today = datetime.now().date()
        twelve_months = today + timedelta(days=365)

        renewals = []

        # Get employee benefits renewals
        benefits = session.query(EmployeeBenefit).all()
        for benefit in benefits:
            # Check all renewal date fields
            renewal_fields = [
                ('renewal_date', 'Medical'),
                ('dental_renewal_date', 'Dental'),
                ('vision_renewal_date', 'Vision'),
                ('life_adnd_renewal_date', 'Life & AD&D'),
                ('ltd_renewal_date', 'LTD'),
                ('std_renewal_date', 'STD'),
                ('k401_renewal_date', '401K'),
                ('critical_illness_renewal_date', 'Critical Illness'),
                ('accident_renewal_date', 'Accident'),
                ('hospital_renewal_date', 'Hospital'),
                ('voluntary_life_renewal_date', 'Voluntary Life')
            ]

            for field_name, policy_type in renewal_fields:
                renewal_date = getattr(benefit, field_name)
                if renewal_date and today <= renewal_date <= twelve_months:
                    # Get carrier field name - special case for Medical which uses 'current_carrier'
                    if field_name == 'renewal_date':
                        carrier = benefit.current_carrier
                    else:
                        carrier = getattr(benefit, field_name.replace('_renewal_date', '_carrier'), None)

                    renewals.append({
                        'type': 'benefits',
                        'policy_type': policy_type,
                        'renewal_date': renewal_date.isoformat(),
                        'client_name': benefit.client.client_name if benefit.client else None,
                        'tax_id': benefit.tax_id,
                        'carrier': carrier
                    })

        # Get commercial renewals
        commercial = session.query(CommercialInsurance).all()
        for comm in commercial:
            renewal_fields = [
                ('general_liability_renewal_date', 'General Liability'),
                ('property_renewal_date', 'Property'),
                ('bop_renewal_date', 'BOP'),
                ('umbrella_renewal_date', 'Umbrella'),
                ('workers_comp_renewal_date', 'Workers Comp'),
                ('professional_eo_renewal_date', 'Professional E&O'),
                ('cyber_renewal_date', 'Cyber'),
                ('auto_renewal_date', 'Auto'),
                ('epli_renewal_date', 'EPLI'),
                ('nydbl_renewal_date', 'NYDBL'),
                ('surety_renewal_date', 'Surety'),
                ('product_liability_renewal_date', 'Product Liability'),
                ('flood_renewal_date', 'Flood'),
                ('crime_renewal_date', 'Crime'),
                ('directors_officers_renewal_date', 'D&O'),
                ('fiduciary_renewal_date', 'Fiduciary'),
                ('inland_marine_renewal_date', 'Inland Marine')
            ]

            for field_name, policy_type in renewal_fields:
                renewal_date = getattr(comm, field_name)
                if renewal_date and today <= renewal_date <= twelve_months:
                    renewals.append({
                        'type': 'commercial',
                        'policy_type': policy_type,
                        'renewal_date': renewal_date.isoformat(),
                        'client_name': comm.client.client_name if comm.client else None,
                        'tax_id': comm.tax_id,
                        'carrier': getattr(comm, field_name.replace('_renewal_date', '_carrier'), None)
                    })

        # Sort by renewal date
        renewals.sort(key=lambda x: x['renewal_date'])

        return jsonify({
            'renewals': renewals,
            'total': len(renewals)
        }), 200
    except Exception as e:
        logging.error(f"Error fetching dashboard renewals: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/dashboard/cross-sell', methods=['GET'])
def get_cross_sell_opportunities():
    """Get cross-sell opportunities (clients with only one type of insurance)."""
    session = Session()
    try:
        all_clients = session.query(Client).all()

        clients_with_benefits_only = []
        clients_with_commercial_only = []

        for client in all_clients:
            has_benefits = len(client.employee_benefits) > 0
            has_commercial = len(client.commercial_insurance) > 0

            if has_benefits and not has_commercial:
                clients_with_benefits_only.append({
                    'tax_id': client.tax_id,
                    'client_name': client.client_name,
                    'contact_person': client.contact_person,
                    'email': client.email
                })
            elif has_commercial and not has_benefits:
                clients_with_commercial_only.append({
                    'tax_id': client.tax_id,
                    'client_name': client.client_name,
                    'contact_person': client.contact_person,
                    'email': client.email
                })

        return jsonify({
            'benefits_only': clients_with_benefits_only,
            'commercial_only': clients_with_commercial_only,
            'total_opportunities': len(clients_with_benefits_only) + len(clients_with_commercial_only)
        }), 200
    except Exception as e:
        logging.error(f"Error fetching cross-sell opportunities: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ===========================================================================
# EXCEL EXPORT/IMPORT ENDPOINTS
# ===========================================================================

@app.route('/api/export', methods=['GET'])
def export_to_excel():
    """Export all data to Excel in the same format as Data Sheet.xlsx."""
    session = Session()
    try:
        wb = Workbook()

        # Header styling
        header_font = Font(bold=True)
        section_font = Font(bold=True, size=11)
        section_fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # ========== CLIENTS SHEET ==========
        ws_clients = wb.active
        ws_clients.title = "Clients"

        # Row 1: Section header
        ws_clients.merge_cells('C1:J1')
        ws_clients['C1'] = 'Contact Info'
        ws_clients['C1'].font = section_font
        ws_clients['C1'].fill = section_fill

        # Row 2: Column headers
        client_headers = ['Tax ID', 'Client Name ', 'Contact Person', 'Email', ' Phone Number',
                         'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip Code']
        for col, header in enumerate(client_headers, 1):
            cell = ws_clients.cell(row=2, column=col, value=header)
            cell.font = header_font

        # Client data
        clients = session.query(Client).all()
        for row_idx, client in enumerate(clients, 3):
            ws_clients.cell(row=row_idx, column=1, value=client.tax_id)
            ws_clients.cell(row=row_idx, column=2, value=client.client_name)
            ws_clients.cell(row=row_idx, column=3, value=client.contact_person)
            ws_clients.cell(row=row_idx, column=4, value=client.email)
            ws_clients.cell(row=row_idx, column=5, value=client.phone_number)
            ws_clients.cell(row=row_idx, column=6, value=client.address_line_1)
            ws_clients.cell(row=row_idx, column=7, value=client.address_line_2)
            ws_clients.cell(row=row_idx, column=8, value=client.city)
            ws_clients.cell(row=row_idx, column=9, value=client.state)
            ws_clients.cell(row=row_idx, column=10, value=client.zip_code)

        # ========== EMPLOYEE BENEFITS SHEET ==========
        ws_benefits = wb.create_sheet("Employee Benefits")

        # Row 1: Section headers
        benefit_sections = [
            (1, 2, ''),
            (3, 13, 'MEDICAL PLANS'),
            (14, 15, 'DENTAL PLANS'),
            (16, 17, 'VISION PLANS'),
            (18, 19, 'Life & AD&D PLANS'),
            (20, 21, 'LTD PLANS'),
            (22, 23, 'STD PLANS'),
            (24, 25, '401K PLANS'),
            (26, 27, 'CRITICAL ILLNESS PLANS'),
            (28, 29, 'ACCIDENT PLANS'),
            (30, 31, 'HOSPITAL PLANS'),
            (32, 33, 'VOLUNTARY LIFE PLANS'),
            (34, 35, '')
        ]
        for start_col, end_col, title in benefit_sections:
            if title:
                if start_col != end_col:
                    ws_benefits.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
                cell = ws_benefits.cell(row=1, column=start_col, value=title)
                cell.font = section_font
                cell.fill = section_fill

        # Row 2: Column headers
        benefit_headers = [
            'Tax ID', 'Client Name ', 'Form Fire Code', 'Enrollment POC', 'Renewal Date',
            'Other Broker', 'Funding', 'Current Carrier', '# of Emp at renewal', 'Waiting Period',
            'Deductible Accumulation', 'Previous Carrier', 'Cobra Administrator',
            'Dental Renewal Date', 'Dental Carrier',
            'Vision Renewal Date', 'Vision Carrier',
            'Life & AD&D Renewal Date', 'Life & AD&D Carrier',
            'LTD Renewal Date', 'LTD Carrier',
            'STD Renewal Date', 'STD Carrier',
            '401K Renewal Date', '401K Carrier',
            'Critical Illness Renewal Date', 'Critical Illness Carrier',
            'Accident Renewal Date', 'Accident Carrier',
            'Hospital Renewal Date', 'Hospital Carrier',
            'Voluntary Life Renewal Date', 'Voluntary Life Carrier',
            'Employer Contribution %', 'Employee Contribution %'
        ]
        for col, header in enumerate(benefit_headers, 1):
            cell = ws_benefits.cell(row=2, column=col, value=header)
            cell.font = header_font

        # Benefits data
        benefits = session.query(EmployeeBenefit).all()
        for row_idx, benefit in enumerate(benefits, 3):
            client_name = benefit.client.client_name if benefit.client else None
            ws_benefits.cell(row=row_idx, column=1, value=benefit.tax_id)
            ws_benefits.cell(row=row_idx, column=2, value=client_name)
            ws_benefits.cell(row=row_idx, column=3, value=benefit.form_fire_code)
            ws_benefits.cell(row=row_idx, column=4, value=benefit.enrollment_poc)
            ws_benefits.cell(row=row_idx, column=5, value=benefit.renewal_date)
            ws_benefits.cell(row=row_idx, column=6, value='None')  # Other Broker - not in model
            ws_benefits.cell(row=row_idx, column=7, value=benefit.funding)
            ws_benefits.cell(row=row_idx, column=8, value=benefit.current_carrier)
            ws_benefits.cell(row=row_idx, column=9, value=benefit.num_employees_at_renewal)
            ws_benefits.cell(row=row_idx, column=10, value=benefit.waiting_period)
            ws_benefits.cell(row=row_idx, column=11, value=benefit.deductible_accumulation)
            ws_benefits.cell(row=row_idx, column=12, value=benefit.previous_carrier)
            ws_benefits.cell(row=row_idx, column=13, value=benefit.cobra_carrier)
            ws_benefits.cell(row=row_idx, column=14, value=benefit.dental_renewal_date)
            ws_benefits.cell(row=row_idx, column=15, value=benefit.dental_carrier)
            ws_benefits.cell(row=row_idx, column=16, value=benefit.vision_renewal_date)
            ws_benefits.cell(row=row_idx, column=17, value=benefit.vision_carrier)
            ws_benefits.cell(row=row_idx, column=18, value=benefit.life_adnd_renewal_date)
            ws_benefits.cell(row=row_idx, column=19, value=benefit.life_adnd_carrier)
            ws_benefits.cell(row=row_idx, column=20, value=benefit.ltd_renewal_date)
            ws_benefits.cell(row=row_idx, column=21, value=benefit.ltd_carrier)
            ws_benefits.cell(row=row_idx, column=22, value=benefit.std_renewal_date)
            ws_benefits.cell(row=row_idx, column=23, value=benefit.std_carrier)
            ws_benefits.cell(row=row_idx, column=24, value=benefit.k401_renewal_date)
            ws_benefits.cell(row=row_idx, column=25, value=benefit.k401_carrier)
            ws_benefits.cell(row=row_idx, column=26, value=benefit.critical_illness_renewal_date)
            ws_benefits.cell(row=row_idx, column=27, value=benefit.critical_illness_carrier)
            ws_benefits.cell(row=row_idx, column=28, value=benefit.accident_renewal_date)
            ws_benefits.cell(row=row_idx, column=29, value=benefit.accident_carrier)
            ws_benefits.cell(row=row_idx, column=30, value=benefit.hospital_renewal_date)
            ws_benefits.cell(row=row_idx, column=31, value=benefit.hospital_carrier)
            ws_benefits.cell(row=row_idx, column=32, value=benefit.voluntary_life_renewal_date)
            ws_benefits.cell(row=row_idx, column=33, value=benefit.voluntary_life_carrier)
            ws_benefits.cell(row=row_idx, column=34, value=benefit.employer_contribution)
            ws_benefits.cell(row=row_idx, column=35, value=benefit.employee_contribution)

        # ========== COMMERCIAL SHEET ==========
        ws_commercial = wb.create_sheet("Commercial")

        # Row 1: Section headers for each insurance type
        commercial_sections = [
            (1, 4, ''),  # Tax ID, Client Name, Remarks, Status
            (5, 8, 'Commercial General Liability'),
            (9, 12, 'Commercial Property'),
            (13, 16, 'Business Owners Policy'),
            (17, 20, 'Umbrella Liability'),
            (21, 24, 'Workers Compensation'),
            (25, 28, 'Professional or E&O'),
            (29, 32, 'Cyber Liability'),
            (33, 36, 'Commercial Auto'),
            (37, 40, 'EPLI'),
            (41, 44, 'NYDBL'),
            (45, 48, 'Surety Bond'),
            (49, 52, 'Product Liability'),
            (53, 56, 'Flood'),
            (57, 60, 'Crime or Fidelity Bond'),
            (61, 64, 'Directors & Officers'),
            (65, 68, 'Fiduciary Bond'),
            (69, 72, 'Inland Marine')
        ]
        for start_col, end_col, title in commercial_sections:
            if title:
                ws_commercial.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
                cell = ws_commercial.cell(row=1, column=start_col, value=title)
                cell.font = section_font
                cell.fill = section_fill

        # Row 2: Column headers
        commercial_headers = ['Tax ID', 'Client Name ', ' Remarks ', ' Status ']
        for _ in range(17):  # 17 insurance types
            commercial_headers.extend(['Carrier', 'Limit', 'Premium', 'Renewal Date'])

        for col, header in enumerate(commercial_headers, 1):
            cell = ws_commercial.cell(row=2, column=col, value=header)
            cell.font = header_font

        # Commercial data
        commercial_records = session.query(CommercialInsurance).all()
        insurance_products = [
            'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
            'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
            'product_liability', 'flood', 'crime', 'directors_officers',
            'fiduciary', 'inland_marine'
        ]

        for row_idx, comm in enumerate(commercial_records, 3):
            client_name = comm.client.client_name if comm.client else None
            ws_commercial.cell(row=row_idx, column=1, value=comm.tax_id)
            ws_commercial.cell(row=row_idx, column=2, value=client_name)
            ws_commercial.cell(row=row_idx, column=3, value=comm.remarks)
            ws_commercial.cell(row=row_idx, column=4, value=comm.status)

            col = 5
            for product in insurance_products:
                carrier = getattr(comm, f'{product}_carrier', None)
                limit_val = getattr(comm, f'{product}_limit', None)
                premium = getattr(comm, f'{product}_premium', None)
                renewal = getattr(comm, f'{product}_renewal_date', None)

                ws_commercial.cell(row=row_idx, column=col, value=carrier or 'None')
                ws_commercial.cell(row=row_idx, column=col+1, value=limit_val or 'N/A')
                ws_commercial.cell(row=row_idx, column=col+2, value=float(premium) if premium else 0)
                ws_commercial.cell(row=row_idx, column=col+3, value=renewal if renewal else 'N/A')
                col += 4

        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'Client_Data_Export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
    except Exception as e:
        logging.error(f"Error exporting to Excel: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/api/import', methods=['POST'])
def import_from_excel():
    """Import data from an Excel file matching the Data Sheet.xlsx format."""
    session = Session()
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'Invalid file format. Please upload an Excel file (.xlsx or .xls)'}), 400

        wb = load_workbook(file)

        stats = {
            'clients_created': 0,
            'clients_updated': 0,
            'benefits_created': 0,
            'benefits_updated': 0,
            'commercial_created': 0,
            'commercial_updated': 0,
            'errors': []
        }

        # ========== IMPORT CLIENTS ==========
        if 'Clients' in wb.sheetnames:
            ws_clients = wb['Clients']
            for row_idx, row in enumerate(ws_clients.iter_rows(min_row=3, values_only=True), start=3):
                if not row[0]:  # Skip empty rows
                    continue
                try:
                    tax_id = str(row[0]).strip() if row[0] else None
                    if not tax_id:
                        continue

                    # Check if client exists
                    existing = session.query(Client).filter_by(tax_id=tax_id).first()

                    if existing:
                        # Update existing client
                        existing.client_name = row[1] if len(row) > 1 else existing.client_name
                        existing.contact_person = row[2] if len(row) > 2 else existing.contact_person
                        existing.email = row[3] if len(row) > 3 else existing.email
                        existing.phone_number = str(row[4]) if len(row) > 4 and row[4] else existing.phone_number
                        existing.address_line_1 = row[5] if len(row) > 5 else existing.address_line_1
                        existing.address_line_2 = row[6] if len(row) > 6 else existing.address_line_2
                        existing.city = row[7] if len(row) > 7 else existing.city
                        existing.state = row[8] if len(row) > 8 else existing.state
                        existing.zip_code = str(row[9]) if len(row) > 9 and row[9] else existing.zip_code
                        stats['clients_updated'] += 1
                    else:
                        # Create new client
                        client = Client(
                            tax_id=tax_id,
                            client_name=row[1] if len(row) > 1 else None,
                            contact_person=row[2] if len(row) > 2 else None,
                            email=row[3] if len(row) > 3 else None,
                            phone_number=str(row[4]) if len(row) > 4 and row[4] else None,
                            address_line_1=row[5] if len(row) > 5 else None,
                            address_line_2=row[6] if len(row) > 6 else None,
                            city=row[7] if len(row) > 7 else None,
                            state=row[8] if len(row) > 8 else None,
                            zip_code=str(row[9]) if len(row) > 9 and row[9] else None
                        )
                        session.add(client)
                        stats['clients_created'] += 1
                except Exception as e:
                    stats['errors'].append(f"Clients row {row_idx}: {str(e)}")

        session.flush()  # Flush to ensure clients are available for FK references

        # ========== IMPORT EMPLOYEE BENEFITS ==========
        if 'Employee Benefits' in wb.sheetnames:
            ws_benefits = wb['Employee Benefits']
            for row_idx, row in enumerate(ws_benefits.iter_rows(min_row=3, values_only=True), start=3):
                if not row[0]:  # Skip empty rows
                    continue
                try:
                    tax_id = str(row[0]).strip() if row[0] else None
                    if not tax_id:
                        continue

                    # Verify client exists
                    client = session.query(Client).filter_by(tax_id=tax_id).first()
                    if not client:
                        stats['errors'].append(f"Benefits row {row_idx}: Client with tax_id {tax_id} not found")
                        continue

                    def parse_excel_date(val):
                        if val is None or val == '' or val == 'N/A':
                            return None
                        if isinstance(val, datetime):
                            return val.date()
                        try:
                            return parse(str(val)).date()
                        except:
                            return None

                    def safe_int(val):
                        if val is None or val == '':
                            return None
                        try:
                            return int(val)
                        except:
                            return None

                    # Check if benefit record exists for this client
                    existing = session.query(EmployeeBenefit).filter_by(tax_id=tax_id).first()

                    benefit_data = {
                        'tax_id': tax_id,
                        'form_fire_code': row[2] if len(row) > 2 else None,
                        'enrollment_poc': row[3] if len(row) > 3 else None,
                        'renewal_date': parse_excel_date(row[4]) if len(row) > 4 else None,
                        'funding': row[6] if len(row) > 6 else None,
                        'current_carrier': row[7] if len(row) > 7 else None,
                        'num_employees_at_renewal': safe_int(row[8]) if len(row) > 8 else None,
                        'waiting_period': row[9] if len(row) > 9 else None,
                        'deductible_accumulation': row[10] if len(row) > 10 else None,
                        'previous_carrier': row[11] if len(row) > 11 else None,
                        'cobra_carrier': row[12] if len(row) > 12 else None,
                        'dental_renewal_date': parse_excel_date(row[13]) if len(row) > 13 else None,
                        'dental_carrier': row[14] if len(row) > 14 else None,
                        'vision_renewal_date': parse_excel_date(row[15]) if len(row) > 15 else None,
                        'vision_carrier': row[16] if len(row) > 16 else None,
                        'life_adnd_renewal_date': parse_excel_date(row[17]) if len(row) > 17 else None,
                        'life_adnd_carrier': row[18] if len(row) > 18 else None,
                        'ltd_renewal_date': parse_excel_date(row[19]) if len(row) > 19 else None,
                        'ltd_carrier': row[20] if len(row) > 20 else None,
                        'std_renewal_date': parse_excel_date(row[21]) if len(row) > 21 else None,
                        'std_carrier': row[22] if len(row) > 22 else None,
                        'k401_renewal_date': parse_excel_date(row[23]) if len(row) > 23 else None,
                        'k401_carrier': row[24] if len(row) > 24 else None,
                        'critical_illness_renewal_date': parse_excel_date(row[25]) if len(row) > 25 else None,
                        'critical_illness_carrier': row[26] if len(row) > 26 else None,
                        'accident_renewal_date': parse_excel_date(row[27]) if len(row) > 27 else None,
                        'accident_carrier': row[28] if len(row) > 28 else None,
                        'hospital_renewal_date': parse_excel_date(row[29]) if len(row) > 29 else None,
                        'hospital_carrier': row[30] if len(row) > 30 else None,
                        'voluntary_life_renewal_date': parse_excel_date(row[31]) if len(row) > 31 else None,
                        'voluntary_life_carrier': row[32] if len(row) > 32 else None,
                        'employer_contribution': str(row[33]) if len(row) > 33 and row[33] else None,
                        'employee_contribution': str(row[34]) if len(row) > 34 and row[34] else None
                    }

                    if existing:
                        for key, val in benefit_data.items():
                            if val is not None:
                                setattr(existing, key, val)
                        stats['benefits_updated'] += 1
                    else:
                        benefit = EmployeeBenefit(**benefit_data)
                        session.add(benefit)
                        stats['benefits_created'] += 1
                except Exception as e:
                    stats['errors'].append(f"Benefits row {row_idx}: {str(e)}")

        # ========== IMPORT COMMERCIAL INSURANCE ==========
        if 'Commercial' in wb.sheetnames:
            ws_commercial = wb['Commercial']
            insurance_products = [
                'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
                'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
                'product_liability', 'flood', 'crime', 'directors_officers',
                'fiduciary', 'inland_marine'
            ]

            for row_idx, row in enumerate(ws_commercial.iter_rows(min_row=3, values_only=True), start=3):
                if not row[0]:  # Skip empty rows
                    continue
                try:
                    tax_id = str(row[0]).strip() if row[0] else None
                    if not tax_id:
                        continue

                    # Verify client exists
                    client = session.query(Client).filter_by(tax_id=tax_id).first()
                    if not client:
                        stats['errors'].append(f"Commercial row {row_idx}: Client with tax_id {tax_id} not found")
                        continue

                    def parse_excel_date(val):
                        if val is None or val == '' or val == 'N/A':
                            return None
                        if isinstance(val, datetime):
                            return val.date()
                        try:
                            return parse(str(val)).date()
                        except:
                            return None

                    def safe_decimal(val):
                        if val is None or val == '' or val == 'N/A':
                            return None
                        try:
                            return float(val)
                        except:
                            return None

                    # Check if commercial record exists for this client
                    existing = session.query(CommercialInsurance).filter_by(tax_id=tax_id).first()

                    commercial_data = {
                        'tax_id': tax_id,
                        'remarks': row[2] if len(row) > 2 else None,
                        'status': row[3] if len(row) > 3 else None
                    }

                    # Parse insurance products (starts at column 5, each product has 4 columns)
                    col = 4
                    for product in insurance_products:
                        if len(row) > col:
                            carrier = row[col] if row[col] and row[col] != 'None' else None
                            limit_val = row[col+1] if len(row) > col+1 and row[col+1] != 'N/A' else None
                            premium = safe_decimal(row[col+2]) if len(row) > col+2 else None
                            renewal = parse_excel_date(row[col+3]) if len(row) > col+3 else None

                            commercial_data[f'{product}_carrier'] = carrier
                            commercial_data[f'{product}_limit'] = limit_val
                            commercial_data[f'{product}_premium'] = premium
                            commercial_data[f'{product}_renewal_date'] = renewal
                        col += 4

                    if existing:
                        for key, val in commercial_data.items():
                            if val is not None:
                                setattr(existing, key, val)
                        stats['commercial_updated'] += 1
                    else:
                        commercial = CommercialInsurance(**commercial_data)
                        session.add(commercial)
                        stats['commercial_created'] += 1
                except Exception as e:
                    stats['errors'].append(f"Commercial row {row_idx}: {str(e)}")

        session.commit()

        return jsonify({
            'message': 'Import completed successfully',
            'stats': stats
        }), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error importing from Excel: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ===========================================================================
# DATABASE INITIALIZATION
# ===========================================================================

if __name__ == '__main__':
    # Create tables
    with app.app_context():
        db.create_all()

    # Run app
    app.run(debug=True, port=5000)
