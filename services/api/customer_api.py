import os
import io
import base64
import logging
import ipaddress
from flask import Flask, jsonify, request, send_file, abort
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, func, or_
from dateutil.parser import parse
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

logging.basicConfig(level=logging.DEBUG)

# Serve React build in production (static_folder points to React build output)
static_folder = os.environ.get('STATIC_FOLDER',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'webapp', 'customer-app', 'build'))
if os.path.isdir(static_folder):
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
else:
    app = Flask(__name__)

# ===========================================================================
# NETWORK ACCESS CONTROL — Local network only
# ===========================================================================
# Private/local IP ranges (RFC 1918 + loopback + link-local)
LOCAL_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),       # Loopback
    ipaddress.ip_network('10.0.0.0/8'),         # Class A private
    ipaddress.ip_network('172.16.0.0/12'),      # Class B private
    ipaddress.ip_network('192.168.0.0/16'),     # Class C private
    ipaddress.ip_network('169.254.0.0/16'),     # Link-local
    ipaddress.ip_network('::1/128'),            # IPv6 loopback
    ipaddress.ip_network('fe80::/10'),          # IPv6 link-local
    ipaddress.ip_network('fc00::/7'),           # IPv6 unique local
]

# Additional allowed IPs/CIDRs from env (comma-separated), e.g. "203.0.113.5,198.51.100.0/24"
extra_allowed = os.environ.get('ALLOWED_IPS', '')
if extra_allowed:
    for cidr in extra_allowed.split(','):
        cidr = cidr.strip()
        if cidr:
            try:
                LOCAL_NETWORKS.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError:
                logging.warning(f"Invalid ALLOWED_IPS entry: {cidr}")

# LAN_ONLY can be set to "false" to disable the restriction (e.g. during development)
LAN_ONLY = os.environ.get('LAN_ONLY', 'true').lower() != 'false'


def is_local_ip(ip_str):
    """Check if an IP address belongs to a local/private network."""
    try:
        addr = ipaddress.ip_address(ip_str)
        return any(addr in network for network in LOCAL_NETWORKS)
    except ValueError:
        return False


@app.before_request
def restrict_to_local_network():
    """Block requests from non-local IP addresses."""
    if not LAN_ONLY:
        return None

    client_ip = request.remote_addr
    if not is_local_ip(client_ip):
        logging.warning(f"Blocked request from non-local IP: {client_ip}")
        abort(403)


# ===========================================================================
# CORS CONFIGURATION
# ===========================================================================
def is_allowed_origin(origin):
    """Check if origin is allowed."""
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    ]
    # Add origins from ALLOWED_ORIGINS env var (comma-separated)
    extra = os.environ.get('ALLOWED_ORIGINS', '')
    if extra:
        allowed_origins.extend([o.strip() for o in extra.split(',') if o.strip()])
    if origin in allowed_origins:
        return True
    # Allow private network origins (http://192.168.x.x:port, http://10.x.x.x:port, etc.)
    if origin:
        try:
            # Extract hostname from origin (e.g. "http://192.168.1.50:5000" -> "192.168.1.50")
            host = origin.split('://')[1].split(':')[0] if '://' in origin else origin.split(':')[0]
            if is_local_ip(host):
                return True
        except (IndexError, ValueError):
            pass
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
db_uri = os.environ.get('DATABASE_URI', 'sqlite://///Users/amandetail/workspaces/client-portal/client-portal/services/customer.db')

# Ensure database directory exists (SQLite can create the file but not the directory)
if db_uri.startswith('sqlite'):
    # Extract path from URI: sqlite:///path or sqlite:////path
    db_path = db_uri.split('sqlite:///')[1] if 'sqlite:///' in db_uri else None
    if db_path:
        db_dir = os.path.dirname(os.path.abspath(db_path))
        if not os.path.isdir(db_dir):
            logging.info(f"Creating database directory: {db_dir}")
            os.makedirs(db_dir, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
db = SQLAlchemy(app)
Session = sessionmaker(bind=engine)
logging.info(f"Database URI: {db_uri}")

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
    status = db.Column(db.String(50), default='Active')
    gross_revenue = db.Column(db.Numeric(15, 2))
    total_ees = db.Column(db.Integer)
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
            'zip_code': self.zip_code,
            'status': self.status,
            'gross_revenue': float(self.gross_revenue) if self.gross_revenue else None,
            'total_ees': self.total_ees
        }


class EmployeeBenefit(db.Model):
    __tablename__ = 'employee_benefits'

    id = db.Column(db.Integer, primary_key=True)
    tax_id = db.Column(db.String(50), db.ForeignKey('clients.tax_id'), nullable=False)

    # Core fields
    status = db.Column(db.String(50))
    outstanding_item = db.Column(db.String(50))
    remarks = db.Column(db.Text)
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

    # Flag columns for single-plan types
    ltd_flag = db.Column(db.Boolean, default=False)
    std_flag = db.Column(db.Boolean, default=False)
    k401_flag = db.Column(db.Boolean, default=False)
    critical_illness_flag = db.Column(db.Boolean, default=False)
    accident_flag = db.Column(db.Boolean, default=False)
    hospital_flag = db.Column(db.Boolean, default=False)
    voluntary_life_flag = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = db.relationship('Client', back_populates='employee_benefits')
    plans = db.relationship('BenefitPlan', back_populates='employee_benefit', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'tax_id': self.tax_id,
            'client_name': self.client.client_name if self.client else None,
            'status': self.status,
            'outstanding_item': self.outstanding_item,
            'remarks': self.remarks,
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
            'employee_contribution': self.employee_contribution,
            'dental_renewal_date': self.dental_renewal_date.isoformat() if self.dental_renewal_date else None,
            'dental_carrier': self.dental_carrier,
            'vision_renewal_date': self.vision_renewal_date.isoformat() if self.vision_renewal_date else None,
            'vision_carrier': self.vision_carrier,
            'life_adnd_renewal_date': self.life_adnd_renewal_date.isoformat() if self.life_adnd_renewal_date else None,
            'life_adnd_carrier': self.life_adnd_carrier,
            'ltd_renewal_date': self.ltd_renewal_date.isoformat() if self.ltd_renewal_date else None,
            'ltd_carrier': self.ltd_carrier,
            'ltd_flag': bool(self.ltd_flag),
            'std_renewal_date': self.std_renewal_date.isoformat() if self.std_renewal_date else None,
            'std_carrier': self.std_carrier,
            'std_flag': bool(self.std_flag),
            'k401_renewal_date': self.k401_renewal_date.isoformat() if self.k401_renewal_date else None,
            'k401_carrier': self.k401_carrier,
            'k401_flag': bool(self.k401_flag),
            'critical_illness_renewal_date': self.critical_illness_renewal_date.isoformat() if self.critical_illness_renewal_date else None,
            'critical_illness_carrier': self.critical_illness_carrier,
            'critical_illness_flag': bool(self.critical_illness_flag),
            'accident_renewal_date': self.accident_renewal_date.isoformat() if self.accident_renewal_date else None,
            'accident_carrier': self.accident_carrier,
            'accident_flag': bool(self.accident_flag),
            'hospital_renewal_date': self.hospital_renewal_date.isoformat() if self.hospital_renewal_date else None,
            'hospital_carrier': self.hospital_carrier,
            'hospital_flag': bool(self.hospital_flag),
            'voluntary_life_renewal_date': self.voluntary_life_renewal_date.isoformat() if self.voluntary_life_renewal_date else None,
            'voluntary_life_carrier': self.voluntary_life_carrier,
            'voluntary_life_flag': bool(self.voluntary_life_flag),
            'plans': self._get_plans_dict()
        }

    def _get_plans_dict(self):
        """Group child BenefitPlan records by type."""
        plans_dict = {'medical': [], 'dental': [], 'vision': [], 'life_adnd': []}
        for plan in (self.plans or []):
            if plan.plan_type in plans_dict:
                plans_dict[plan.plan_type].append(plan.to_dict())
        for pt in plans_dict:
            plans_dict[pt].sort(key=lambda p: p['plan_number'])
        return plans_dict


MULTI_PLAN_TYPES = ['medical', 'dental', 'vision', 'life_adnd']


class BenefitPlan(db.Model):
    __tablename__ = 'benefit_plans'

    id = db.Column(db.Integer, primary_key=True)
    employee_benefit_id = db.Column(db.Integer, db.ForeignKey('employee_benefits.id'), nullable=False)
    plan_type = db.Column(db.String(50), nullable=False)
    plan_number = db.Column(db.Integer, nullable=False, default=1)
    carrier = db.Column(db.String(200))
    renewal_date = db.Column(db.Date)
    flag = db.Column(db.Boolean, default=False)
    waiting_period = db.Column(db.String(100))

    # Relationship
    employee_benefit = db.relationship('EmployeeBenefit', back_populates='plans')

    def to_dict(self):
        return {
            'id': self.id,
            'plan_type': self.plan_type,
            'plan_number': self.plan_number,
            'carrier': self.carrier,
            'renewal_date': self.renewal_date.isoformat() if self.renewal_date else None,
            'flag': bool(self.flag),
            'waiting_period': self.waiting_period
        }


class CommercialInsurance(db.Model):
    __tablename__ = 'commercial_insurance'

    id = db.Column(db.Integer, primary_key=True)
    tax_id = db.Column(db.String(50), db.ForeignKey('clients.tax_id'), nullable=False)

    # Core fields
    remarks = db.Column(db.Text)
    status = db.Column(db.String(50))
    outstanding_item = db.Column(db.String(50))

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

    # Flag columns for single-plan types
    general_liability_flag = db.Column(db.Boolean, default=False)
    property_flag = db.Column(db.Boolean, default=False)
    bop_flag = db.Column(db.Boolean, default=False)
    workers_comp_flag = db.Column(db.Boolean, default=False)
    auto_flag = db.Column(db.Boolean, default=False)
    epli_flag = db.Column(db.Boolean, default=False)
    nydbl_flag = db.Column(db.Boolean, default=False)
    surety_flag = db.Column(db.Boolean, default=False)
    product_liability_flag = db.Column(db.Boolean, default=False)
    flood_flag = db.Column(db.Boolean, default=False)
    directors_officers_flag = db.Column(db.Boolean, default=False)
    fiduciary_flag = db.Column(db.Boolean, default=False)
    inland_marine_flag = db.Column(db.Boolean, default=False)

    # Relationships
    client = db.relationship('Client', back_populates='commercial_insurance')
    commercial_plans = db.relationship('CommercialPlan', back_populates='commercial_insurance', cascade='all, delete-orphan')

    def to_dict(self):
        def format_premium(val):
            return float(val) if val else None

        result = {
            'id': self.id,
            'tax_id': self.tax_id,
            'client_name': self.client.client_name if self.client else None,
            'remarks': self.remarks,
            'status': self.status,
            'outstanding_item': self.outstanding_item,
            'general_liability_carrier': self.general_liability_carrier,
            'general_liability_limit': self.general_liability_limit,
            'general_liability_premium': format_premium(self.general_liability_premium),
            'general_liability_renewal_date': self.general_liability_renewal_date.isoformat() if self.general_liability_renewal_date else None,
            'general_liability_flag': bool(self.general_liability_flag),
            'property_carrier': self.property_carrier,
            'property_limit': self.property_limit,
            'property_premium': format_premium(self.property_premium),
            'property_renewal_date': self.property_renewal_date.isoformat() if self.property_renewal_date else None,
            'property_flag': bool(self.property_flag),
            'bop_carrier': self.bop_carrier,
            'bop_limit': self.bop_limit,
            'bop_premium': format_premium(self.bop_premium),
            'bop_renewal_date': self.bop_renewal_date.isoformat() if self.bop_renewal_date else None,
            'bop_flag': bool(self.bop_flag),
            'umbrella_carrier': self.umbrella_carrier,
            'umbrella_limit': self.umbrella_limit,
            'umbrella_premium': format_premium(self.umbrella_premium),
            'umbrella_renewal_date': self.umbrella_renewal_date.isoformat() if self.umbrella_renewal_date else None,
            'workers_comp_carrier': self.workers_comp_carrier,
            'workers_comp_limit': self.workers_comp_limit,
            'workers_comp_premium': format_premium(self.workers_comp_premium),
            'workers_comp_renewal_date': self.workers_comp_renewal_date.isoformat() if self.workers_comp_renewal_date else None,
            'workers_comp_flag': bool(self.workers_comp_flag),
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
            'auto_flag': bool(self.auto_flag),
            'epli_carrier': self.epli_carrier,
            'epli_limit': self.epli_limit,
            'epli_premium': format_premium(self.epli_premium),
            'epli_renewal_date': self.epli_renewal_date.isoformat() if self.epli_renewal_date else None,
            'epli_flag': bool(self.epli_flag),
            'nydbl_carrier': self.nydbl_carrier,
            'nydbl_limit': self.nydbl_limit,
            'nydbl_premium': format_premium(self.nydbl_premium),
            'nydbl_renewal_date': self.nydbl_renewal_date.isoformat() if self.nydbl_renewal_date else None,
            'nydbl_flag': bool(self.nydbl_flag),
            'surety_carrier': self.surety_carrier,
            'surety_limit': self.surety_limit,
            'surety_premium': format_premium(self.surety_premium),
            'surety_renewal_date': self.surety_renewal_date.isoformat() if self.surety_renewal_date else None,
            'surety_flag': bool(self.surety_flag),
            'product_liability_carrier': self.product_liability_carrier,
            'product_liability_limit': self.product_liability_limit,
            'product_liability_premium': format_premium(self.product_liability_premium),
            'product_liability_renewal_date': self.product_liability_renewal_date.isoformat() if self.product_liability_renewal_date else None,
            'product_liability_flag': bool(self.product_liability_flag),
            'flood_carrier': self.flood_carrier,
            'flood_limit': self.flood_limit,
            'flood_premium': format_premium(self.flood_premium),
            'flood_renewal_date': self.flood_renewal_date.isoformat() if self.flood_renewal_date else None,
            'flood_flag': bool(self.flood_flag),
            'crime_carrier': self.crime_carrier,
            'crime_limit': self.crime_limit,
            'crime_premium': format_premium(self.crime_premium),
            'crime_renewal_date': self.crime_renewal_date.isoformat() if self.crime_renewal_date else None,
            'directors_officers_carrier': self.directors_officers_carrier,
            'directors_officers_limit': self.directors_officers_limit,
            'directors_officers_premium': format_premium(self.directors_officers_premium),
            'directors_officers_renewal_date': self.directors_officers_renewal_date.isoformat() if self.directors_officers_renewal_date else None,
            'directors_officers_flag': bool(self.directors_officers_flag),
            'fiduciary_carrier': self.fiduciary_carrier,
            'fiduciary_limit': self.fiduciary_limit,
            'fiduciary_premium': format_premium(self.fiduciary_premium),
            'fiduciary_renewal_date': self.fiduciary_renewal_date.isoformat() if self.fiduciary_renewal_date else None,
            'fiduciary_flag': bool(self.fiduciary_flag),
            'inland_marine_carrier': self.inland_marine_carrier,
            'inland_marine_limit': self.inland_marine_limit,
            'inland_marine_premium': format_premium(self.inland_marine_premium),
            'inland_marine_renewal_date': self.inland_marine_renewal_date.isoformat() if self.inland_marine_renewal_date else None,
            'inland_marine_flag': bool(self.inland_marine_flag),
            'plans': self._get_commercial_plans_dict()
        }
        return result

    def _get_commercial_plans_dict(self):
        """Group child CommercialPlan records by type."""
        plans_dict = {'umbrella': [], 'professional_eo': [], 'cyber': [], 'crime': []}
        for plan in (self.commercial_plans or []):
            if plan.plan_type in plans_dict:
                plans_dict[plan.plan_type].append(plan.to_dict())
        for pt in plans_dict:
            plans_dict[pt].sort(key=lambda p: p['plan_number'])
        return plans_dict

MULTI_PLAN_COMMERCIAL_TYPES = ['umbrella', 'professional_eo', 'cyber', 'crime']


class CommercialPlan(db.Model):
    __tablename__ = 'commercial_plans'

    id = db.Column(db.Integer, primary_key=True)
    commercial_insurance_id = db.Column(db.Integer, db.ForeignKey('commercial_insurance.id'), nullable=False)
    plan_type = db.Column(db.String(50), nullable=False)
    plan_number = db.Column(db.Integer, nullable=False, default=1)
    carrier = db.Column(db.String(200))
    coverage_limit = db.Column(db.String(100))
    premium = db.Column(db.Numeric(12, 2))
    renewal_date = db.Column(db.Date)
    flag = db.Column(db.Boolean, default=False)

    # Relationship
    commercial_insurance = db.relationship('CommercialInsurance', back_populates='commercial_plans')

    def to_dict(self):
        return {
            'id': self.id,
            'plan_type': self.plan_type,
            'plan_number': self.plan_number,
            'carrier': self.carrier,
            'limit': self.coverage_limit,
            'premium': float(self.premium) if self.premium else None,
            'renewal_date': self.renewal_date.isoformat() if self.renewal_date else None,
            'flag': bool(self.flag)
        }


class Feedback(db.Model):
    __tablename__ = 'feedback'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False, default='Bug')
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), nullable=False, default='New')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'subject': self.subject,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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


def save_benefit_plans(session, benefit, plans_data):
    """Save multi-plan child records for a benefit. Deletes existing plans first."""
    # Delete existing plans for this benefit
    session.query(BenefitPlan).filter_by(employee_benefit_id=benefit.id).delete()
    session.flush()

    for plan_type in MULTI_PLAN_TYPES:
        for idx, plan_info in enumerate(plans_data.get(plan_type, []), 1):
            carrier = plan_info.get('carrier')
            renewal = plan_info.get('renewal_date')
            if carrier or renewal:
                plan = BenefitPlan(
                    employee_benefit_id=benefit.id,
                    plan_type=plan_type,
                    plan_number=idx,
                    carrier=carrier,
                    renewal_date=parse_date(renewal),
                    flag=bool(plan_info.get('flag', False)),
                    waiting_period=plan_info.get('waiting_period') or None
                )
                session.add(plan)

    # Also update flat fields from first plan for backward compat
    for plan_type in MULTI_PLAN_TYPES:
        plans_for_type = plans_data.get(plan_type, [])
        first = plans_for_type[0] if plans_for_type else {}
        if plan_type == 'medical':
            benefit.current_carrier = first.get('carrier') or None
            benefit.renewal_date = parse_date(first.get('renewal_date'))
        else:
            setattr(benefit, f'{plan_type}_carrier', first.get('carrier') or None)
            setattr(benefit, f'{plan_type}_renewal_date', parse_date(first.get('renewal_date')))


def save_commercial_plans(session, commercial, plans_data):
    """Save multi-plan child records for commercial insurance. Deletes existing plans first."""
    session.query(CommercialPlan).filter_by(commercial_insurance_id=commercial.id).delete()
    session.flush()

    for plan_type in MULTI_PLAN_COMMERCIAL_TYPES:
        for idx, plan_info in enumerate(plans_data.get(plan_type, []), 1):
            carrier = plan_info.get('carrier')
            renewal = plan_info.get('renewal_date')
            limit_val = plan_info.get('limit')
            premium_val = plan_info.get('premium')
            if carrier or renewal or limit_val or premium_val:
                plan = CommercialPlan(
                    commercial_insurance_id=commercial.id,
                    plan_type=plan_type,
                    plan_number=idx,
                    carrier=carrier,
                    coverage_limit=limit_val,
                    premium=parse_premium(premium_val),
                    renewal_date=parse_date(renewal),
                    flag=bool(plan_info.get('flag', False))
                )
                session.add(plan)

    # Also update flat fields from first plan for backward compat
    for plan_type in MULTI_PLAN_COMMERCIAL_TYPES:
        plans_for_type = plans_data.get(plan_type, [])
        first = plans_for_type[0] if plans_for_type else {}
        setattr(commercial, f'{plan_type}_carrier', first.get('carrier') or None)
        setattr(commercial, f'{plan_type}_limit', first.get('limit') or None)
        setattr(commercial, f'{plan_type}_premium', parse_premium(first.get('premium')))
        setattr(commercial, f'{plan_type}_renewal_date', parse_date(first.get('renewal_date')))


def parse_premium(val):
    """Parse premium value to float, returning None for empty/invalid values."""
    if val is None or val == '':
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
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
            zip_code=data.get('zip_code'),
            status=data.get('status', 'Active'),
            gross_revenue=data.get('gross_revenue'),
            total_ees=data.get('total_ees')
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
        client.status = data.get('status', client.status)
        client.gross_revenue = data.get('gross_revenue', client.gross_revenue)
        client.total_ees = data.get('total_ees', client.total_ees)

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
            zip_code=original.zip_code,
            status=original.status,
            gross_revenue=original.gross_revenue,
            total_ees=original.total_ees
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
            status=data.get('status'),
            outstanding_item=data.get('outstanding_item'),
            remarks=data.get('remarks'),
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
            voluntary_life_carrier=data.get('voluntary_life_carrier'),
            # Single-plan flags
            ltd_flag=bool(data.get('ltd_flag', False)),
            std_flag=bool(data.get('std_flag', False)),
            k401_flag=bool(data.get('k401_flag', False)),
            critical_illness_flag=bool(data.get('critical_illness_flag', False)),
            accident_flag=bool(data.get('accident_flag', False)),
            hospital_flag=bool(data.get('hospital_flag', False)),
            voluntary_life_flag=bool(data.get('voluntary_life_flag', False))
        )

        session.add(benefit)
        session.flush()

        # Save multi-plan child records if provided
        if 'plans' in data:
            save_benefit_plans(session, benefit, data['plans'])

        session.commit()

        # Refresh to load plans relationship
        session.refresh(benefit)

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
        benefit.status = data.get('status', benefit.status)
        benefit.outstanding_item = data.get('outstanding_item', benefit.outstanding_item)
        benefit.remarks = data.get('remarks', benefit.remarks)
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

        # Update single-plan flag columns
        for prefix in ['ltd', 'std', 'k401', 'critical_illness', 'accident', 'hospital', 'voluntary_life']:
            if f'{prefix}_flag' in data:
                setattr(benefit, f'{prefix}_flag', bool(data.get(f'{prefix}_flag', False)))

        # Save multi-plan child records if provided
        if 'plans' in data:
            save_benefit_plans(session, benefit, data['plans'])

        session.commit()

        # Refresh to load updated plans relationship
        session.refresh(benefit)

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
            status=original.status,
            outstanding_item=original.outstanding_item,
            remarks=original.remarks,
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
        session.flush()

        # Clone child BenefitPlan records
        for plan in original.plans:
            new_plan = BenefitPlan(
                employee_benefit_id=new_benefit.id,
                plan_type=plan.plan_type,
                plan_number=plan.plan_number,
                carrier=plan.carrier,
                renewal_date=plan.renewal_date,
                flag=plan.flag
            )
            session.add(new_plan)

        session.commit()

        session.refresh(new_benefit)

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

        # Single-plan product types (not in MULTI_PLAN_COMMERCIAL_TYPES)
        single_plan_products = [
            'general_liability', 'property', 'bop', 'workers_comp', 'auto',
            'epli', 'nydbl', 'surety', 'product_liability', 'flood',
            'directors_officers', 'fiduciary', 'inland_marine'
        ]

        commercial = CommercialInsurance(
            tax_id=data.get('tax_id'),
            remarks=data.get('remarks'),
            status=data.get('status'),
            outstanding_item=data.get('outstanding_item'),
        )

        # Set single-plan product fields (carrier, limit, premium, renewal_date, flag)
        for product in single_plan_products:
            setattr(commercial, f'{product}_carrier', data.get(f'{product}_carrier') or None)
            setattr(commercial, f'{product}_limit', data.get(f'{product}_limit') or None)
            setattr(commercial, f'{product}_premium', parse_premium(data.get(f'{product}_premium')))
            setattr(commercial, f'{product}_renewal_date', parse_date(data.get(f'{product}_renewal_date')))
            setattr(commercial, f'{product}_flag', bool(data.get(f'{product}_flag', False)))

        # Multi-plan type flat fields (backward compat - will be overwritten by save_commercial_plans)
        for product in MULTI_PLAN_COMMERCIAL_TYPES:
            setattr(commercial, f'{product}_carrier', data.get(f'{product}_carrier') or None)
            setattr(commercial, f'{product}_limit', data.get(f'{product}_limit') or None)
            setattr(commercial, f'{product}_premium', parse_premium(data.get(f'{product}_premium')))
            setattr(commercial, f'{product}_renewal_date', parse_date(data.get(f'{product}_renewal_date')))

        session.add(commercial)
        session.flush()

        # Save multi-plan child records if plans data provided
        if 'plans' in data:
            save_commercial_plans(session, commercial, data['plans'])

        session.commit()
        session.refresh(commercial)

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
        commercial.outstanding_item = data.get('outstanding_item', commercial.outstanding_item)

        # Update single-plan insurance products
        single_plan_products = [
            'general_liability', 'property', 'bop', 'workers_comp', 'auto',
            'epli', 'nydbl', 'surety', 'product_liability', 'flood',
            'directors_officers', 'fiduciary', 'inland_marine'
        ]
        for product in single_plan_products:
            if f'{product}_carrier' in data:
                setattr(commercial, f'{product}_carrier', data.get(f'{product}_carrier') or None)
            if f'{product}_limit' in data:
                setattr(commercial, f'{product}_limit', data.get(f'{product}_limit') or None)
            if f'{product}_premium' in data:
                setattr(commercial, f'{product}_premium', parse_premium(data.get(f'{product}_premium')))
            if f'{product}_renewal_date' in data:
                setattr(commercial, f'{product}_renewal_date', parse_date(data.get(f'{product}_renewal_date')))
            if f'{product}_flag' in data:
                setattr(commercial, f'{product}_flag', bool(data.get(f'{product}_flag', False)))

        # Update multi-plan type flat fields (backward compat)
        for product in MULTI_PLAN_COMMERCIAL_TYPES:
            if f'{product}_carrier' in data:
                setattr(commercial, f'{product}_carrier', data.get(f'{product}_carrier') or None)
            if f'{product}_limit' in data:
                setattr(commercial, f'{product}_limit', data.get(f'{product}_limit') or None)
            if f'{product}_premium' in data:
                setattr(commercial, f'{product}_premium', parse_premium(data.get(f'{product}_premium')))
            if f'{product}_renewal_date' in data:
                setattr(commercial, f'{product}_renewal_date', parse_date(data.get(f'{product}_renewal_date')))

        # Save multi-plan child records if plans data provided
        if 'plans' in data:
            save_commercial_plans(session, commercial, data['plans'])

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
            outstanding_item=original.outstanding_item,
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

        # Copy flag columns for single-plan types
        for product in ['general_liability', 'property', 'bop', 'workers_comp', 'auto',
                       'epli', 'nydbl', 'surety', 'product_liability', 'flood',
                       'directors_officers', 'fiduciary', 'inland_marine']:
            setattr(new_commercial, f'{product}_flag', getattr(original, f'{product}_flag', False))

        session.add(new_commercial)
        session.flush()

        # Clone child CommercialPlan records
        for plan in original.commercial_plans:
            new_plan = CommercialPlan(
                commercial_insurance_id=new_commercial.id,
                plan_type=plan.plan_type,
                plan_number=plan.plan_number,
                carrier=plan.carrier,
                coverage_limit=plan.coverage_limit,
                premium=plan.premium,
                renewal_date=plan.renewal_date,
                flag=plan.flag
            )
            session.add(new_plan)

        session.commit()
        session.refresh(new_commercial)

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
        multi_plan_type_names = {'medical': 'Medical', 'dental': 'Dental', 'vision': 'Vision', 'life_adnd': 'Life & AD&D'}
        benefits = session.query(EmployeeBenefit).all()
        for benefit in benefits:
            # Multi-plan types: read from benefit_plans child table
            for plan in benefit.plans:
                if plan.renewal_date and today <= plan.renewal_date <= twelve_months:
                    type_name = multi_plan_type_names.get(plan.plan_type, plan.plan_type)
                    label = f"{type_name} Plan {plan.plan_number}" if plan.plan_number > 1 else type_name
                    renewals.append({
                        'type': 'benefits',
                        'policy_type': label,
                        'renewal_date': plan.renewal_date.isoformat(),
                        'client_name': benefit.client.client_name if benefit.client else None,
                        'tax_id': benefit.tax_id,
                        'carrier': plan.carrier
                    })

            # Single-plan types: read from flat fields
            single_plan_fields = [
                ('ltd_renewal_date', 'LTD'),
                ('std_renewal_date', 'STD'),
                ('k401_renewal_date', '401K'),
                ('critical_illness_renewal_date', 'Critical Illness'),
                ('accident_renewal_date', 'Accident'),
                ('hospital_renewal_date', 'Hospital'),
                ('voluntary_life_renewal_date', 'Voluntary Life')
            ]

            for field_name, policy_type in single_plan_fields:
                renewal_date = getattr(benefit, field_name)
                if renewal_date and today <= renewal_date <= twelve_months:
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
        multi_plan_commercial_names = {'umbrella': 'Umbrella', 'professional_eo': 'Professional E&O', 'cyber': 'Cyber', 'crime': 'Crime'}
        commercial = session.query(CommercialInsurance).all()
        for comm in commercial:
            # Multi-plan types: read from commercial_plans child table
            for plan in comm.commercial_plans:
                if plan.renewal_date and today <= plan.renewal_date <= twelve_months:
                    type_name = multi_plan_commercial_names.get(plan.plan_type, plan.plan_type)
                    label = f"{type_name} Plan {plan.plan_number}" if plan.plan_number > 1 else type_name
                    renewals.append({
                        'type': 'commercial',
                        'policy_type': label,
                        'renewal_date': plan.renewal_date.isoformat(),
                        'client_name': comm.client.client_name if comm.client else None,
                        'tax_id': comm.tax_id,
                        'carrier': plan.carrier
                    })

            # Single-plan types: read from flat fields
            single_plan_fields = [
                ('general_liability_renewal_date', 'General Liability'),
                ('property_renewal_date', 'Property'),
                ('bop_renewal_date', 'BOP'),
                ('workers_comp_renewal_date', 'Workers Comp'),
                ('auto_renewal_date', 'Auto'),
                ('epli_renewal_date', 'EPLI'),
                ('nydbl_renewal_date', 'NYDBL'),
                ('surety_renewal_date', 'Surety'),
                ('product_liability_renewal_date', 'Product Liability'),
                ('flood_renewal_date', 'Flood'),
                ('directors_officers_renewal_date', 'D&O'),
                ('fiduciary_renewal_date', 'Fiduciary'),
                ('inland_marine_renewal_date', 'Inland Marine')
            ]

            for field_name, policy_type in single_plan_fields:
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
        client_headers = ['Tax ID', 'Client Name ', 'Status', 'Gross Revenue', 'Total EEs',
                         'Contact Person', 'Email', ' Phone Number',
                         'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip Code']
        for col, header in enumerate(client_headers, 1):
            cell = ws_clients.cell(row=2, column=col, value=header)
            cell.font = header_font

        # Client data
        clients = session.query(Client).all()
        for row_idx, client in enumerate(clients, 3):
            ws_clients.cell(row=row_idx, column=1, value=client.tax_id)
            ws_clients.cell(row=row_idx, column=2, value=client.client_name)
            ws_clients.cell(row=row_idx, column=3, value=client.status)
            ws_clients.cell(row=row_idx, column=4, value=float(client.gross_revenue) if client.gross_revenue else None)
            ws_clients.cell(row=row_idx, column=5, value=client.total_ees)
            ws_clients.cell(row=row_idx, column=6, value=client.contact_person)
            ws_clients.cell(row=row_idx, column=7, value=client.email)
            ws_clients.cell(row=row_idx, column=8, value=client.phone_number)
            ws_clients.cell(row=row_idx, column=9, value=client.address_line_1)
            ws_clients.cell(row=row_idx, column=10, value=client.address_line_2)
            ws_clients.cell(row=row_idx, column=11, value=client.city)
            ws_clients.cell(row=row_idx, column=12, value=client.state)
            ws_clients.cell(row=row_idx, column=13, value=client.zip_code)

        # ========== EMPLOYEE BENEFITS SHEET ==========
        ws_benefits = wb.create_sheet("Employee Benefits")

        # Load benefits and determine max plan counts for dynamic columns
        benefits = session.query(EmployeeBenefit).all()

        multi_plan_defs = [
            ('medical', 'MEDICAL'),
            ('dental', 'DENTAL'),
            ('vision', 'VISION'),
            ('life_adnd', 'Life & AD&D')
        ]

        # Determine max number of plans per type across all benefits
        max_plans = {}
        for plan_type, _ in multi_plan_defs:
            max_count = 1  # At least 1 column per type
            for benefit in benefits:
                count = len([p for p in benefit.plans if p.plan_type == plan_type])
                if count > max_count:
                    max_count = count
            max_plans[plan_type] = max_count

        # Build dynamic headers and section spans
        # Fixed columns: Tax ID, Client Name, Status, Outstanding Item, Remarks (cols 1-5)
        # Medical global fields: Form Fire Code, Enrollment POC, Other Broker, Funding,
        #   # of Emp at renewal, Waiting Period, Deductible Accumulation, Previous Carrier, Cobra Administrator (9 cols)
        # Then dynamic multi-plan columns (carrier + renewal per plan)
        # Then single-plan types (7 types x 2 cols = 14 cols)
        # Then 1095 (2 cols)

        benefit_headers = ['Tax ID', 'Client Name ', 'Status', 'Outstanding Item', 'Remarks',
                           'Form Fire Code', 'Enrollment POC', 'Other Broker', 'Funding',
                           '# of Emp at renewal', 'Waiting Period', 'Deductible Accumulation',
                           'Previous Carrier', 'Cobra Administrator']
        # Track col position (1-based) — after fixed cols
        col_pos = len(benefit_headers) + 1  # Next col to use

        benefit_sections = [(1, 5, ''), (6, 14, 'MEDICAL GLOBAL')]

        # Multi-plan type dynamic columns
        multi_plan_col_map = {}  # plan_type -> start_col (for data writing)
        for plan_type, label in multi_plan_defs:
            n = max_plans[plan_type]
            start = col_pos
            for i in range(1, n + 1):
                suffix = f' {i}' if n > 1 else ''
                benefit_headers.append(f'{label} Carrier{suffix}')
                benefit_headers.append(f'{label} Renewal Date{suffix}')
                benefit_headers.append(f'{label} Flag{suffix}')
                benefit_headers.append(f'{label} Waiting Period{suffix}')
            multi_plan_col_map[plan_type] = start
            end = col_pos + n * 4 - 1
            benefit_sections.append((start, end, f'{label} PLANS'))
            col_pos += n * 4

        # Single-plan types
        single_plan_types = [
            ('ltd', 'LTD'), ('std', 'STD'), ('k401', '401K'),
            ('critical_illness', 'Critical Illness'), ('accident', 'Accident'),
            ('hospital', 'Hospital'), ('voluntary_life', 'Voluntary Life')
        ]
        single_plan_col_start = col_pos
        for prefix, label in single_plan_types:
            benefit_headers.append(f'{label} Renewal Date')
            benefit_headers.append(f'{label} Carrier')
            benefit_headers.append(f'{label} Flag')
            benefit_sections.append((col_pos, col_pos + 2, f'{label.upper()} PLANS'))
            col_pos += 3

        # 1095
        benefit_headers.extend(['Employer Contribution %', 'Employee Contribution %'])
        benefit_sections.append((col_pos, col_pos + 1, '1095'))

        # Write section headers (Row 1)
        for start_col, end_col, title in benefit_sections:
            if title:
                if start_col != end_col:
                    ws_benefits.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
                cell = ws_benefits.cell(row=1, column=start_col, value=title)
                cell.font = section_font
                cell.fill = section_fill

        # Write column headers (Row 2)
        for col, header in enumerate(benefit_headers, 1):
            cell = ws_benefits.cell(row=2, column=col, value=header)
            cell.font = header_font

        # Write benefits data
        for row_idx, benefit in enumerate(benefits, 3):
            client_name = benefit.client.client_name if benefit.client else None
            c = 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.tax_id); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=client_name); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.status); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.outstanding_item); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.remarks); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.form_fire_code); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.enrollment_poc); c += 1
            ws_benefits.cell(row=row_idx, column=c, value='None'); c += 1  # Other Broker
            ws_benefits.cell(row=row_idx, column=c, value=benefit.funding); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.num_employees_at_renewal); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.waiting_period); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.deductible_accumulation); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.previous_carrier); c += 1
            ws_benefits.cell(row=row_idx, column=c, value=benefit.cobra_carrier); c += 1

            # Multi-plan types: write dynamic columns (carrier, renewal, flag per plan)
            plans_by_type = {}
            for plan in benefit.plans:
                plans_by_type.setdefault(plan.plan_type, []).append(plan)
            for plan_type, _ in multi_plan_defs:
                type_plans = sorted(plans_by_type.get(plan_type, []), key=lambda p: p.plan_number)
                start = multi_plan_col_map[plan_type]
                for i in range(max_plans[plan_type]):
                    if i < len(type_plans):
                        ws_benefits.cell(row=row_idx, column=start + i * 4, value=type_plans[i].carrier)
                        ws_benefits.cell(row=row_idx, column=start + i * 4 + 1, value=type_plans[i].renewal_date)
                        ws_benefits.cell(row=row_idx, column=start + i * 4 + 2, value=bool(type_plans[i].flag))
                        ws_benefits.cell(row=row_idx, column=start + i * 4 + 3, value=type_plans[i].waiting_period)
                    # else leave blank

            # Single-plan types (renewal, carrier, flag)
            sc = single_plan_col_start
            for prefix, label in single_plan_types:
                ws_benefits.cell(row=row_idx, column=sc, value=getattr(benefit, f'{prefix}_renewal_date'))
                ws_benefits.cell(row=row_idx, column=sc + 1, value=getattr(benefit, f'{prefix}_carrier'))
                ws_benefits.cell(row=row_idx, column=sc + 2, value=bool(getattr(benefit, f'{prefix}_flag', False)))
                sc += 3

            # 1095
            ws_benefits.cell(row=row_idx, column=sc, value=benefit.employee_contribution)

        # ========== COMMERCIAL SHEET ==========
        ws_commercial = wb.create_sheet("Commercial")

        commercial_records = session.query(CommercialInsurance).all()

        # Single-plan types (flat fields, 5 cols each: carrier, limit, premium, renewal, flag)
        commercial_single_plan_defs = [
            ('general_liability', 'Commercial General Liability'),
            ('property', 'Commercial Property'),
            ('bop', 'Business Owners Policy'),
            ('workers_comp', 'Workers Compensation'),
            ('auto', 'Commercial Auto'),
            ('epli', 'EPLI'),
            ('nydbl', 'NYDBL'),
            ('surety', 'Surety Bond'),
            ('product_liability', 'Product Liability'),
            ('flood', 'Flood'),
            ('directors_officers', 'Directors & Officers'),
            ('fiduciary', 'Fiduciary Bond'),
            ('inland_marine', 'Inland Marine')
        ]

        # Multi-plan types (dynamic cols from CommercialPlan child records)
        commercial_multi_plan_defs = [
            ('umbrella', 'Umbrella Liability'),
            ('professional_eo', 'Professional or E&O'),
            ('cyber', 'Cyber Liability'),
            ('crime', 'Crime or Fidelity Bond')
        ]

        # Determine max number of plans per multi-plan type
        comm_max_plans = {}
        for plan_type, _ in commercial_multi_plan_defs:
            max_count = 1
            for comm in commercial_records:
                count = len([p for p in comm.commercial_plans if p.plan_type == plan_type])
                if count > max_count:
                    max_count = count
            comm_max_plans[plan_type] = max_count

        # Build headers dynamically
        commercial_headers = ['Tax ID', 'Client Name ', ' Remarks ', ' Status ', 'Outstanding Item']
        commercial_sections = [(1, 5, '')]
        col_pos = 6

        # Single-plan type columns (5 cols each: carrier, limit, premium, renewal, flag)
        comm_single_col_start = col_pos
        for prefix, label in commercial_single_plan_defs:
            commercial_headers.extend(['Carrier', 'Limit', 'Premium', 'Renewal Date', 'Flag'])
            commercial_sections.append((col_pos, col_pos + 4, label))
            col_pos += 5

        # Multi-plan type columns (5 cols per plan: carrier, limit, premium, renewal, flag)
        comm_multi_col_map = {}
        for plan_type, label in commercial_multi_plan_defs:
            n = comm_max_plans[plan_type]
            start = col_pos
            for i in range(1, n + 1):
                suffix = f' {i}' if n > 1 else ''
                commercial_headers.extend([f'Carrier{suffix}', f'Limit{suffix}', f'Premium{suffix}', f'Renewal Date{suffix}', f'Flag{suffix}'])
            comm_multi_col_map[plan_type] = start
            end = col_pos + n * 5 - 1
            commercial_sections.append((start, end, label))
            col_pos += n * 5

        # Write section headers (Row 1)
        for start_col, end_col, title in commercial_sections:
            if title:
                if start_col != end_col:
                    ws_commercial.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
                cell = ws_commercial.cell(row=1, column=start_col, value=title)
                cell.font = section_font
                cell.fill = section_fill

        # Write column headers (Row 2)
        for col, header in enumerate(commercial_headers, 1):
            cell = ws_commercial.cell(row=2, column=col, value=header)
            cell.font = header_font

        # Write commercial data
        for row_idx, comm in enumerate(commercial_records, 3):
            client_name = comm.client.client_name if comm.client else None
            ws_commercial.cell(row=row_idx, column=1, value=comm.tax_id)
            ws_commercial.cell(row=row_idx, column=2, value=client_name)
            ws_commercial.cell(row=row_idx, column=3, value=comm.remarks)
            ws_commercial.cell(row=row_idx, column=4, value=comm.status)
            ws_commercial.cell(row=row_idx, column=5, value=comm.outstanding_item)

            # Single-plan types (5 cols each: carrier, limit, premium, renewal, flag)
            sc = comm_single_col_start
            for prefix, label in commercial_single_plan_defs:
                ws_commercial.cell(row=row_idx, column=sc, value=getattr(comm, f'{prefix}_carrier', None) or 'None')
                ws_commercial.cell(row=row_idx, column=sc + 1, value=getattr(comm, f'{prefix}_limit', None) or 'N/A')
                premium = getattr(comm, f'{prefix}_premium', None)
                ws_commercial.cell(row=row_idx, column=sc + 2, value=float(premium) if premium else 0)
                ws_commercial.cell(row=row_idx, column=sc + 3, value=getattr(comm, f'{prefix}_renewal_date', None) or 'N/A')
                ws_commercial.cell(row=row_idx, column=sc + 4, value=bool(getattr(comm, f'{prefix}_flag', False)))
                sc += 5

            # Multi-plan types (5 cols per plan: carrier, limit, premium, renewal, flag)
            plans_by_type = {}
            for plan in comm.commercial_plans:
                plans_by_type.setdefault(plan.plan_type, []).append(plan)
            for plan_type, _ in commercial_multi_plan_defs:
                type_plans = sorted(plans_by_type.get(plan_type, []), key=lambda p: p.plan_number)
                start = comm_multi_col_map[plan_type]
                for i in range(comm_max_plans[plan_type]):
                    if i < len(type_plans):
                        ws_commercial.cell(row=row_idx, column=start + i * 5, value=type_plans[i].carrier)
                        ws_commercial.cell(row=row_idx, column=start + i * 5 + 1, value=type_plans[i].coverage_limit)
                        ws_commercial.cell(row=row_idx, column=start + i * 5 + 2, value=float(type_plans[i].premium) if type_plans[i].premium else 0)
                        ws_commercial.cell(row=row_idx, column=start + i * 5 + 3, value=type_plans[i].renewal_date)
                        ws_commercial.cell(row=row_idx, column=start + i * 5 + 4, value=bool(type_plans[i].flag))

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

        # Error row collectors for errors.xlsx generation
        error_rows_clients = []      # [(row_tuple, error_msg), ...]
        error_rows_benefits = []
        error_rows_commercial = []

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
                        existing.status = row[2] if len(row) > 2 and row[2] else existing.status
                        existing.gross_revenue = float(row[3]) if len(row) > 3 and row[3] else existing.gross_revenue
                        existing.total_ees = int(row[4]) if len(row) > 4 and row[4] else existing.total_ees
                        existing.contact_person = row[5] if len(row) > 5 else existing.contact_person
                        existing.email = row[6] if len(row) > 6 else existing.email
                        existing.phone_number = str(row[7]) if len(row) > 7 and row[7] else existing.phone_number
                        existing.address_line_1 = row[8] if len(row) > 8 else existing.address_line_1
                        existing.address_line_2 = row[9] if len(row) > 9 else existing.address_line_2
                        existing.city = row[10] if len(row) > 10 else existing.city
                        existing.state = row[11] if len(row) > 11 else existing.state
                        existing.zip_code = str(row[12]) if len(row) > 12 and row[12] else existing.zip_code
                        stats['clients_updated'] += 1
                    else:
                        # Create new client
                        client = Client(
                            tax_id=tax_id,
                            client_name=row[1] if len(row) > 1 else None,
                            status=row[2] if len(row) > 2 and row[2] else 'Active',
                            gross_revenue=float(row[3]) if len(row) > 3 and row[3] else None,
                            total_ees=int(row[4]) if len(row) > 4 and row[4] else None,
                            contact_person=row[5] if len(row) > 5 else None,
                            email=row[6] if len(row) > 6 else None,
                            phone_number=str(row[7]) if len(row) > 7 and row[7] else None,
                            address_line_1=row[8] if len(row) > 8 else None,
                            address_line_2=row[9] if len(row) > 9 else None,
                            city=row[10] if len(row) > 10 else None,
                            state=row[11] if len(row) > 11 else None,
                            zip_code=str(row[12]) if len(row) > 12 and row[12] else None
                        )
                        session.add(client)
                        stats['clients_created'] += 1
                except Exception as e:
                    error_rows_clients.append((row, str(e)))
                    stats['errors'].append(f"Clients row {row_idx}: {str(e)}")

        session.flush()  # Flush to ensure clients are available for FK references

        # ========== IMPORT EMPLOYEE BENEFITS ==========
        if 'Employee Benefits' in wb.sheetnames:
            ws_benefits = wb['Employee Benefits']

            # Read headers from row 2 to detect multi-plan columns dynamically
            headers = []
            for cell in ws_benefits[2]:
                headers.append(str(cell.value).strip() if cell.value else '')

            # Detect multi-plan column positions by header pattern
            multi_plan_header_map = {
                'medical': 'MEDICAL',
                'dental': 'DENTAL',
                'vision': 'VISION',
                'life_adnd': 'Life & AD&D'
            }

            # Find column indices for each multi-plan type (carrier/renewal/flag/waiting_period quads)
            multi_plan_cols = {}  # plan_type -> [(carrier_col, renewal_col, flag_col, wp_col), ...]
            for plan_type, label in multi_plan_header_map.items():
                cols = []
                for i, h in enumerate(headers):
                    if h and label.upper() in h.upper() and 'CARRIER' in h.upper():
                        renewal_col = i + 1 if i + 1 < len(headers) and 'RENEWAL' in headers[i + 1].upper() else None
                        flag_col = i + 2 if i + 2 < len(headers) and 'FLAG' in headers[i + 2].upper() else None
                        wp_col = i + 3 if i + 3 < len(headers) and 'WAITING' in headers[i + 3].upper() else None
                        cols.append((i, renewal_col, flag_col, wp_col))
                multi_plan_cols[plan_type] = cols

            # Find single-plan type columns by header
            single_plan_col_map = {}  # prefix -> (renewal_col, carrier_col, flag_col)
            single_plan_labels = {
                'ltd': 'LTD', 'std': 'STD', 'k401': '401K',
                'critical_illness': 'Critical Illness', 'accident': 'Accident',
                'hospital': 'Hospital', 'voluntary_life': 'Voluntary Life'
            }
            for prefix, label in single_plan_labels.items():
                for i, h in enumerate(headers):
                    if h and label.upper() in h.upper() and 'RENEWAL' in h.upper():
                        is_multi = any(label.upper() == ml.upper() for ml in multi_plan_header_map.values())
                        if not is_multi:
                            carrier_col = i + 1 if i + 1 < len(headers) and 'CARRIER' in headers[i + 1].upper() else None
                            flag_col = i + 2 if i + 2 < len(headers) and 'FLAG' in headers[i + 2].upper() else None
                            single_plan_col_map[prefix] = (i, carrier_col, flag_col)
                            break

            # Find fixed column indices
            def find_col(name):
                name_upper = name.upper()
                for i, h in enumerate(headers):
                    if h.upper().strip() == name_upper:
                        return i
                return None

            col_employee_contribution = None
            for i, h in enumerate(headers):
                if h and ('EMPLOYEE CONTRIBUTION' in h.upper() or 'EMPLOYER CONTRIBUTION' in h.upper()):
                    col_employee_contribution = i
                    break

            for row_idx, row in enumerate(ws_benefits.iter_rows(min_row=3, values_only=True), start=3):
                if not row[0]:
                    continue
                try:
                    tax_id = str(row[0]).strip() if row[0] else None
                    if not tax_id:
                        continue

                    client = session.query(Client).filter_by(tax_id=tax_id).first()
                    if not client:
                        error_rows_benefits.append((row, f"Client with tax_id {tax_id} not found"))
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

                    def safe_val(idx):
                        return row[idx] if len(row) > idx and row[idx] else None

                    existing = session.query(EmployeeBenefit).filter_by(tax_id=tax_id).first()

                    benefit_data = {
                        'tax_id': tax_id,
                        'status': safe_val(2),
                        'outstanding_item': safe_val(3),
                        'remarks': safe_val(4),
                        'form_fire_code': safe_val(5),
                        'enrollment_poc': safe_val(6),
                        'funding': safe_val(8),
                        'num_employees_at_renewal': safe_int(safe_val(9)),
                        'waiting_period': safe_val(10),
                        'deductible_accumulation': safe_val(11),
                        'previous_carrier': safe_val(12),
                        'cobra_carrier': safe_val(13),
                        'employee_contribution': str(row[col_employee_contribution]) if col_employee_contribution and len(row) > col_employee_contribution and row[col_employee_contribution] else None
                    }

                    # Single-plan types
                    for prefix, (renewal_col, carrier_col, flag_col) in single_plan_col_map.items():
                        if renewal_col is not None:
                            benefit_data[f'{prefix}_renewal_date'] = parse_excel_date(safe_val(renewal_col))
                        if carrier_col is not None:
                            benefit_data[f'{prefix}_carrier'] = safe_val(carrier_col)
                        if flag_col is not None:
                            flag_val = safe_val(flag_col)
                            benefit_data[f'{prefix}_flag'] = bool(flag_val) if flag_val else False

                    if existing:
                        for key, val in benefit_data.items():
                            if val is not None:
                                setattr(existing, key, val)
                        benefit_obj = existing
                        stats['benefits_updated'] += 1
                    else:
                        benefit_obj = EmployeeBenefit(**benefit_data)
                        session.add(benefit_obj)
                        session.flush()
                        stats['benefits_created'] += 1

                    # Multi-plan types: create BenefitPlan child records
                    session.query(BenefitPlan).filter_by(employee_benefit_id=benefit_obj.id).delete()
                    for plan_type, cols_list in multi_plan_cols.items():
                        for plan_num, (carrier_col, renewal_col, flag_col, wp_col) in enumerate(cols_list, 1):
                            carrier = safe_val(carrier_col)
                            renewal = parse_excel_date(safe_val(renewal_col)) if renewal_col is not None else None
                            flag_val = bool(safe_val(flag_col)) if flag_col is not None and safe_val(flag_col) else False
                            wp_val = safe_val(wp_col) if wp_col is not None else None
                            if carrier or renewal:
                                plan = BenefitPlan(
                                    employee_benefit_id=benefit_obj.id,
                                    plan_type=plan_type,
                                    plan_number=plan_num,
                                    carrier=carrier,
                                    renewal_date=renewal,
                                    flag=flag_val,
                                    waiting_period=wp_val
                                )
                                session.add(plan)
                                # Also set flat fields from first plan
                                if plan_num == 1:
                                    if plan_type == 'medical':
                                        benefit_obj.current_carrier = carrier
                                        benefit_obj.renewal_date = renewal
                                    else:
                                        setattr(benefit_obj, f'{plan_type}_carrier', carrier)
                                        setattr(benefit_obj, f'{plan_type}_renewal_date', renewal)

                except Exception as e:
                    error_rows_benefits.append((row, str(e)))
                    stats['errors'].append(f"Benefits row {row_idx}: {str(e)}")

        # ========== IMPORT COMMERCIAL INSURANCE ==========
        if 'Commercial' in wb.sheetnames:
            ws_commercial = wb['Commercial']

            # Read headers from row 2 to detect column positions dynamically
            comm_headers = []
            for cell in ws_commercial[2]:
                comm_headers.append(str(cell.value).strip() if cell.value else '')

            # Read section headers from row 1 to identify product type boundaries
            section_headers = []
            for cell in ws_commercial[1]:
                section_headers.append(str(cell.value).strip() if cell.value else '')

            # Single-plan types: 5 cols each (Carrier, Limit, Premium, Renewal Date, Flag)
            commercial_single_import_defs = [
                ('general_liability', 'Commercial General Liability'),
                ('property', 'Commercial Property'),
                ('bop', 'Business Owners Policy'),
                ('workers_comp', 'Workers Compensation'),
                ('auto', 'Commercial Auto'),
                ('epli', 'EPLI'),
                ('nydbl', 'NYDBL'),
                ('surety', 'Surety Bond'),
                ('product_liability', 'Product Liability'),
                ('flood', 'Flood'),
                ('directors_officers', 'Directors & Officers'),
                ('fiduciary', 'Fiduciary Bond'),
                ('inland_marine', 'Inland Marine')
            ]

            # Multi-plan types: dynamic cols (Carrier, Limit, Premium, Renewal Date, Flag per plan)
            commercial_multi_import_defs = [
                ('umbrella', 'Umbrella Liability'),
                ('professional_eo', 'Professional or E&O'),
                ('cyber', 'Cyber Liability'),
                ('crime', 'Crime or Fidelity Bond')
            ]

            # Find section start columns from row 1
            section_col_map = {}
            for i, sh in enumerate(section_headers):
                if sh and sh != 'None':
                    section_col_map[sh] = i

            # Build column maps for single-plan types
            comm_single_col_map = {}  # prefix -> start_col (0-based)
            for prefix, label in commercial_single_import_defs:
                if label in section_col_map:
                    comm_single_col_map[prefix] = section_col_map[label]

            # Build column maps for multi-plan types — detect how many plans per type
            comm_multi_col_map = {}  # plan_type -> [(carrier_col, limit_col, premium_col, renewal_col, flag_col), ...]
            for plan_type, label in commercial_multi_import_defs:
                if label in section_col_map:
                    start = section_col_map[label]
                    # Count columns belonging to this section (until next section or end)
                    plans = []
                    i = start
                    while i < len(comm_headers):
                        h = comm_headers[i].upper()
                        if 'CARRIER' in h:
                            limit_col = i + 1 if i + 1 < len(comm_headers) and 'LIMIT' in comm_headers[i + 1].upper() else None
                            premium_col = i + 2 if i + 2 < len(comm_headers) and 'PREMIUM' in comm_headers[i + 2].upper() else None
                            renewal_col = i + 3 if i + 3 < len(comm_headers) and 'RENEWAL' in comm_headers[i + 3].upper() else None
                            flag_col = i + 4 if i + 4 < len(comm_headers) and 'FLAG' in comm_headers[i + 4].upper() else None
                            plans.append((i, limit_col, premium_col, renewal_col, flag_col))
                            i += 5
                        else:
                            break
                    comm_multi_col_map[plan_type] = plans

            for row_idx, row in enumerate(ws_commercial.iter_rows(min_row=3, values_only=True), start=3):
                if not row[0]:
                    continue
                try:
                    tax_id = str(row[0]).strip() if row[0] else None
                    if not tax_id:
                        continue

                    client = session.query(Client).filter_by(tax_id=tax_id).first()
                    if not client:
                        error_rows_commercial.append((row, f"Client with tax_id {tax_id} not found"))
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

                    def safe_val(idx):
                        return row[idx] if len(row) > idx and row[idx] else None

                    existing = session.query(CommercialInsurance).filter_by(tax_id=tax_id).first()

                    commercial_data = {
                        'tax_id': tax_id,
                        'remarks': row[2] if len(row) > 2 else None,
                        'status': row[3] if len(row) > 3 else None,
                        'outstanding_item': row[4] if len(row) > 4 else None
                    }

                    # Single-plan types (5 cols each: carrier, limit, premium, renewal, flag)
                    for prefix, label in commercial_single_import_defs:
                        if prefix in comm_single_col_map:
                            sc = comm_single_col_map[prefix]
                            carrier = safe_val(sc)
                            if carrier and carrier == 'None':
                                carrier = None
                            commercial_data[f'{prefix}_carrier'] = carrier
                            limit_val = safe_val(sc + 1)
                            if limit_val and limit_val == 'N/A':
                                limit_val = None
                            commercial_data[f'{prefix}_limit'] = limit_val
                            commercial_data[f'{prefix}_premium'] = safe_decimal(safe_val(sc + 2))
                            commercial_data[f'{prefix}_renewal_date'] = parse_excel_date(safe_val(sc + 3))
                            flag_val = safe_val(sc + 4)
                            commercial_data[f'{prefix}_flag'] = bool(flag_val) if flag_val else False

                    if existing:
                        for key, val in commercial_data.items():
                            if val is not None:
                                setattr(existing, key, val)
                        comm_obj = existing
                        stats['commercial_updated'] += 1
                    else:
                        comm_obj = CommercialInsurance(**commercial_data)
                        session.add(comm_obj)
                        session.flush()
                        stats['commercial_created'] += 1

                    # Multi-plan types: create CommercialPlan child records
                    session.query(CommercialPlan).filter_by(commercial_insurance_id=comm_obj.id).delete()
                    for plan_type, cols_list in comm_multi_col_map.items():
                        for plan_num, (carrier_col, limit_col, premium_col, renewal_col, flag_col) in enumerate(cols_list, 1):
                            carrier = safe_val(carrier_col)
                            limit_val = safe_val(limit_col) if limit_col is not None else None
                            premium = safe_decimal(safe_val(premium_col)) if premium_col is not None else None
                            renewal = parse_excel_date(safe_val(renewal_col)) if renewal_col is not None else None
                            flag_val = bool(safe_val(flag_col)) if flag_col is not None and safe_val(flag_col) else False
                            if carrier or limit_val or premium or renewal:
                                plan = CommercialPlan(
                                    commercial_insurance_id=comm_obj.id,
                                    plan_type=plan_type,
                                    plan_number=plan_num,
                                    carrier=carrier,
                                    coverage_limit=limit_val if limit_val and limit_val != 'N/A' else None,
                                    premium=premium,
                                    renewal_date=renewal,
                                    flag=flag_val
                                )
                                session.add(plan)
                                # Set flat fields from first plan for backward compat
                                if plan_num == 1:
                                    setattr(comm_obj, f'{plan_type}_carrier', carrier)
                                    setattr(comm_obj, f'{plan_type}_limit', limit_val if limit_val and limit_val != 'N/A' else None)
                                    setattr(comm_obj, f'{plan_type}_premium', premium)
                                    setattr(comm_obj, f'{plan_type}_renewal_date', renewal)

                except Exception as e:
                    error_rows_commercial.append((row, str(e)))
                    stats['errors'].append(f"Commercial row {row_idx}: {str(e)}")

        session.commit()

        # ========== BUILD ERRORS WORKBOOK ==========
        response_data = {
            'message': 'Import completed successfully',
            'stats': stats
        }

        has_errors = error_rows_clients or error_rows_benefits or error_rows_commercial
        if has_errors:
            error_wb = Workbook()
            error_wb.remove(error_wb.active)  # Remove default sheet

            # Helper: copy headers from source sheet to error sheet, append "Error" column
            def copy_headers_and_write_errors(source_sheet_name, error_rows):
                if not error_rows:
                    return
                src_ws = wb[source_sheet_name]
                err_ws = error_wb.create_sheet(source_sheet_name)

                # Find the max column used in row 2 (column headers)
                max_col = 0
                for cell in src_ws[2]:
                    if cell.value is not None:
                        max_col = cell.column

                # Copy row 1 (section headers) with merged cells
                for cell in src_ws[1]:
                    if cell.value is not None:
                        err_ws.cell(row=1, column=cell.column, value=cell.value)
                        err_ws.cell(row=1, column=cell.column).font = Font(bold=True, size=11)
                        err_ws.cell(row=1, column=cell.column).fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")

                # Copy merged cells from row 1
                for merged_range in src_ws.merged_cells.ranges:
                    if merged_range.min_row == 1 and merged_range.max_row == 1:
                        err_ws.merge_cells(start_row=1, start_column=merged_range.min_col,
                                           end_row=1, end_column=merged_range.max_col)

                # Copy row 2 (column headers)
                for cell in src_ws[2]:
                    if cell.value is not None:
                        err_ws.cell(row=2, column=cell.column, value=cell.value)
                        err_ws.cell(row=2, column=cell.column).font = Font(bold=True)

                # Append "Error" column header
                error_col = max_col + 1
                err_ws.cell(row=2, column=error_col, value='Error')
                err_ws.cell(row=2, column=error_col).font = Font(bold=True, color="FF0000")

                # Write errored rows
                for data_row_idx, (row_data, error_msg) in enumerate(error_rows, 3):
                    for col_idx, val in enumerate(row_data, 1):
                        # Convert date/datetime objects to string for safe writing
                        if isinstance(val, datetime):
                            val = val.strftime('%m/%d/%Y')
                        elif hasattr(val, 'strftime'):
                            val = val.strftime('%m/%d/%Y')
                        err_ws.cell(row=data_row_idx, column=col_idx, value=val)
                    err_ws.cell(row=data_row_idx, column=error_col, value=error_msg)

            # Build error sheets for each tab that has errors
            if 'Clients' in wb.sheetnames:
                copy_headers_and_write_errors('Clients', error_rows_clients)
            if 'Employee Benefits' in wb.sheetnames:
                copy_headers_and_write_errors('Employee Benefits', error_rows_benefits)
            if 'Commercial' in wb.sheetnames:
                copy_headers_and_write_errors('Commercial', error_rows_commercial)

            # Encode as base64
            error_output = io.BytesIO()
            error_wb.save(error_output)
            error_output.seek(0)
            errors_b64 = base64.b64encode(error_output.read()).decode('utf-8')

            response_data['errors_file'] = errors_b64
            response_data['errors_filename'] = f'Import_Errors_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'

        return jsonify(response_data), 200
    except Exception as e:
        session.rollback()
        logging.error(f"Error importing from Excel: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ===========================================================================
# FEEDBACK ENDPOINTS
# ===========================================================================

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    """Get all feedback items."""
    try:
        items = Feedback.query.order_by(Feedback.created_at.desc()).all()
        return jsonify({'feedback': [item.to_dict() for item in items]}), 200
    except Exception as e:
        logging.error(f"Error fetching feedback: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback', methods=['POST'])
def create_feedback():
    """Create a new feedback item."""
    try:
        data = request.get_json()
        item = Feedback(
            type=data.get('type', 'Bug'),
            subject=data.get('subject', ''),
            description=data.get('description', ''),
            status=data.get('status', 'New')
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating feedback: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback/<int:feedback_id>', methods=['PUT'])
def update_feedback(feedback_id):
    """Update a feedback item."""
    try:
        item = Feedback.query.get(feedback_id)
        if not item:
            return jsonify({'error': 'Feedback not found'}), 404

        data = request.get_json()
        if 'type' in data:
            item.type = data['type']
        if 'subject' in data:
            item.subject = data['subject']
        if 'description' in data:
            item.description = data['description']
        if 'status' in data:
            item.status = data['status']
        item.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify(item.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating feedback: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback/<int:feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    """Delete a feedback item."""
    try:
        item = Feedback.query.get(feedback_id)
        if not item:
            return jsonify({'error': 'Feedback not found'}), 404

        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Feedback deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting feedback: {e}")
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# HEALTH CHECK
# ===========================================================================

@app.route('/api/health')
def health_check():
    """Quick health check — verifies DB connectivity."""
    try:
        with app.app_context():
            db.session.execute(db.text('SELECT 1'))
        return jsonify({
            'status': 'ok',
            'database': db_uri.split('?')[0],  # show path without query params
            'static_folder': app.static_folder or 'not configured'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'database': db_uri.split('?')[0],
            'error': str(e)
        }), 500


# ===========================================================================
# SERVE REACT APP (production mode)
# ===========================================================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """Serve React build files. API routes take priority (registered first)."""
    if app.static_folder and os.path.isdir(app.static_folder):
        file_path = os.path.join(app.static_folder, path)
        if path and os.path.isfile(file_path):
            return send_file(file_path)
        index = os.path.join(app.static_folder, 'index.html')
        if os.path.isfile(index):
            return send_file(index)
    return jsonify({'error': 'Not found'}), 404


# ===========================================================================
# DATABASE INITIALIZATION
# ===========================================================================

if __name__ == '__main__':
    # Create tables
    with app.app_context():
        db.create_all()

    # Run app (host/port configurable via env vars)
    host = os.environ.get('API_HOST', '127.0.0.1')
    port = int(os.environ.get('API_PORT', '5000'))
    debug = os.environ.get('API_DEBUG', 'true').lower() == 'true'
    app.run(debug=debug, host=host, port=port)
