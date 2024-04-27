# This is a sample Python script.

# Press ⌃R to execute it or replace it with your code.
# Press Double ⇧ to search everywhere for classes, files, tool windows, actions, and settings.
import sqlite3
import datetime
import csv

def print_hi(name):
    # Use a breakpoint in the code line below to debug your script.
    print(f'Hi, {name}')  # Press ⌘F8 to toggle the breakpoint.
    print('the time is :', datetime.datetime.now())


def insert_customer(row_to_insert):
    conn = sqlite3.connect('customer.db')
    cursor = conn.cursor()
    table_name = 'customer'
    sql_query = f"INSERT INTO {table_name} (Renewal_Date, Other_Broker, Group_Name, Contact_Person, Email, Phone_Number, Funding, Current_Carrier, Num_Employees_At_Renewal, Waiting_Period, Deductible_Accumulation, Previous_Carrier, Cobra_Carrier, Dental_Effective_Date, Dental_Carrier, Vision_Effective_Date, Vision_Carrier, Life_And_ADND_Effective_Date, Life_And_ADND_Carrier, LTD_Effective_Date, LTD_Carrier, STD_Effective_Date, STD_Carrier, Effective_Date_401K, Carrier_401K, Employer, Employee, PNC, Employee_Navigator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    cursor.execute(sql_query, row_to_insert)
    conn.commit()
    conn.close()



def import_data_from_csv():
    with open('Customer_Data.csv', 'r') as csvfile:
        reader = csv.reader(csvfile)
        next(reader)
        next(reader)
        for row in reader:
            insert_customer(row)

# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    print_hi('PyCharm')
    # insert_student()
    # remove_student('students', 11)
    #remove_student_by_name('students', 'John', 'Doe')
    import_data_from_csv()






