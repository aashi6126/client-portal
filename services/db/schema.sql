-- Client Portal Database Schema
-- Three tables: Clients (master), Employee Benefits, Commercial Insurance

-- ============================================================================
-- CLIENTS TABLE (Master Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_id VARCHAR(50) NOT NULL UNIQUE,
    client_name VARCHAR(200),
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone_number VARCHAR(50),
    address_line_1 VARCHAR(200),
    address_line_2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'Active',
    gross_revenue DECIMAL(15, 2),
    total_ees INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_tax_id ON clients(tax_id);

-- ============================================================================
-- EMPLOYEE BENEFITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_benefits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_id VARCHAR(50) NOT NULL,

    -- Core fields
    form_fire_code VARCHAR(100),
    enrollment_poc VARCHAR(200),
    renewal_date DATE,
    funding VARCHAR(100),
    current_carrier VARCHAR(200),
    num_employees_at_renewal INTEGER,
    waiting_period VARCHAR(100),
    deductible_accumulation VARCHAR(100),
    previous_carrier VARCHAR(200),
    cobra_carrier VARCHAR(200),
    employee_contribution VARCHAR(50),

    -- Dental
    dental_renewal_date DATE,
    dental_carrier VARCHAR(200),

    -- Vision
    vision_renewal_date DATE,
    vision_carrier VARCHAR(200),

    -- Life & AD&D
    life_adnd_renewal_date DATE,
    life_adnd_carrier VARCHAR(200),

    -- LTD (Long-Term Disability)
    ltd_renewal_date DATE,
    ltd_carrier VARCHAR(200),

    -- STD (Short-Term Disability)
    std_renewal_date DATE,
    std_carrier VARCHAR(200),

    -- 401K
    k401_renewal_date DATE,
    k401_carrier VARCHAR(200),

    -- Critical Illness
    critical_illness_renewal_date DATE,
    critical_illness_carrier VARCHAR(200),

    -- Accident
    accident_renewal_date DATE,
    accident_carrier VARCHAR(200),

    -- Hospital
    hospital_renewal_date DATE,
    hospital_carrier VARCHAR(200),

    -- Voluntary Life
    voluntary_life_renewal_date DATE,
    voluntary_life_carrier VARCHAR(200),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tax_id) REFERENCES clients(tax_id) ON DELETE CASCADE
);

CREATE INDEX idx_employee_benefits_tax_id ON employee_benefits(tax_id);
CREATE INDEX idx_employee_benefits_renewal_date ON employee_benefits(renewal_date);

-- ============================================================================
-- BENEFIT PLANS TABLE (Child of Employee Benefits - supports multiple plans)
-- Covers: Medical, Dental, Vision, Life & AD&D
-- ============================================================================
CREATE TABLE IF NOT EXISTS benefit_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_benefit_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL,   -- medical, dental, vision, life_adnd
    plan_number INTEGER NOT NULL DEFAULT 1,
    carrier VARCHAR(200),
    renewal_date DATE,
    flag BOOLEAN DEFAULT 0,
    waiting_period VARCHAR(100),

    FOREIGN KEY (employee_benefit_id) REFERENCES employee_benefits(id) ON DELETE CASCADE
);

CREATE INDEX idx_benefit_plans_employee_benefit_id ON benefit_plans(employee_benefit_id);
CREATE INDEX idx_benefit_plans_plan_type ON benefit_plans(plan_type);

-- ============================================================================
-- COMMERCIAL INSURANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS commercial_insurance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_id VARCHAR(50) NOT NULL,

    -- Core fields
    remarks TEXT,
    status VARCHAR(50),
    outstanding_item VARCHAR(50),

    -- 1. Commercial General Liability
    general_liability_carrier VARCHAR(200),
    general_liability_limit VARCHAR(100),
    general_liability_premium DECIMAL(12, 2),
    general_liability_renewal_date DATE,

    -- 2. Commercial Property
    property_carrier VARCHAR(200),
    property_limit VARCHAR(100),
    property_premium DECIMAL(12, 2),
    property_renewal_date DATE,

    -- 3. Business Owners Policy (BOP)
    bop_carrier VARCHAR(200),
    bop_limit VARCHAR(100),
    bop_premium DECIMAL(12, 2),
    bop_renewal_date DATE,

    -- 4. Umbrella Liability
    umbrella_carrier VARCHAR(200),
    umbrella_limit VARCHAR(100),
    umbrella_premium DECIMAL(12, 2),
    umbrella_renewal_date DATE,

    -- 5. Workers Compensation
    workers_comp_carrier VARCHAR(200),
    workers_comp_limit VARCHAR(100),
    workers_comp_premium DECIMAL(12, 2),
    workers_comp_renewal_date DATE,

    -- 6. Professional or E&O
    professional_eo_carrier VARCHAR(200),
    professional_eo_limit VARCHAR(100),
    professional_eo_premium DECIMAL(12, 2),
    professional_eo_renewal_date DATE,

    -- 7. Cyber Liability
    cyber_carrier VARCHAR(200),
    cyber_limit VARCHAR(100),
    cyber_premium DECIMAL(12, 2),
    cyber_renewal_date DATE,

    -- 8. Commercial Auto
    auto_carrier VARCHAR(200),
    auto_limit VARCHAR(100),
    auto_premium DECIMAL(12, 2),
    auto_renewal_date DATE,

    -- 9. EPLI (Employment Practices Liability)
    epli_carrier VARCHAR(200),
    epli_limit VARCHAR(100),
    epli_premium DECIMAL(12, 2),
    epli_renewal_date DATE,

    -- 10. NYDBL (NY Disability Benefit Law)
    nydbl_carrier VARCHAR(200),
    nydbl_limit VARCHAR(100),
    nydbl_premium DECIMAL(12, 2),
    nydbl_renewal_date DATE,

    -- 11. Surety Bond
    surety_carrier VARCHAR(200),
    surety_limit VARCHAR(100),
    surety_premium DECIMAL(12, 2),
    surety_renewal_date DATE,

    -- 12. Product Liability
    product_liability_carrier VARCHAR(200),
    product_liability_limit VARCHAR(100),
    product_liability_premium DECIMAL(12, 2),
    product_liability_renewal_date DATE,

    -- 13. Flood
    flood_carrier VARCHAR(200),
    flood_limit VARCHAR(100),
    flood_premium DECIMAL(12, 2),
    flood_renewal_date DATE,

    -- 14. Crime or Fidelity Bond
    crime_carrier VARCHAR(200),
    crime_limit VARCHAR(100),
    crime_premium DECIMAL(12, 2),
    crime_renewal_date DATE,

    -- 15. Directors & Officers
    directors_officers_carrier VARCHAR(200),
    directors_officers_limit VARCHAR(100),
    directors_officers_premium DECIMAL(12, 2),
    directors_officers_renewal_date DATE,

    -- 16. Fiduciary Bond
    fiduciary_carrier VARCHAR(200),
    fiduciary_limit VARCHAR(100),
    fiduciary_premium DECIMAL(12, 2),
    fiduciary_renewal_date DATE,

    -- 17. Inland Marine
    inland_marine_carrier VARCHAR(200),
    inland_marine_limit VARCHAR(100),
    inland_marine_premium DECIMAL(12, 2),
    inland_marine_renewal_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tax_id) REFERENCES clients(tax_id) ON DELETE CASCADE
);

CREATE INDEX idx_commercial_insurance_tax_id ON commercial_insurance(tax_id);
CREATE INDEX idx_commercial_insurance_status ON commercial_insurance(status);

-- ============================================================================
-- COMMERCIAL PLANS TABLE (Child of Commercial Insurance - supports multiple plans)
-- Covers: Umbrella, Professional E&O, Cyber, Crime
-- ============================================================================
CREATE TABLE IF NOT EXISTS commercial_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commercial_insurance_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL,   -- umbrella, professional_eo, cyber, crime
    plan_number INTEGER NOT NULL DEFAULT 1,
    carrier VARCHAR(200),
    coverage_limit VARCHAR(100),
    premium DECIMAL(12, 2),
    renewal_date DATE,
    flag BOOLEAN DEFAULT 0,

    FOREIGN KEY (commercial_insurance_id) REFERENCES commercial_insurance(id) ON DELETE CASCADE
);

CREATE INDEX idx_commercial_plans_commercial_insurance_id ON commercial_plans(commercial_insurance_id);
CREATE INDEX idx_commercial_plans_plan_type ON commercial_plans(plan_type);

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50) NOT NULL DEFAULT 'Bug',
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_status ON feedback(status);
