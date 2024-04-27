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


def insert_student(row_to_insert):
    conn = sqlite3.connect('students.db')
    cursor = conn.cursor()
    table_name = 'students'
    #row_to_insert = (4, 'Jane', 'Doe', '18', '10th', 'XYZ High School', '7 continental ct', '777-884-9930')
    sql_query = f"INSERT INTO {table_name} VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    cursor.execute(sql_query, row_to_insert)
    conn.commit()
    conn.close()

def remove_student(table_name, row_id):
    conn = sqlite3.connect('students.db')
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table_name} WHERE student_id = ?", (row_id,))
    conn.commit()
    conn.close()

def remove_student_by_name(table_name, first_name, last_name):
    conn = sqlite3.connect('students.db')
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table_name} WHERE first_name = ? AND last_name = ?", (first_name, last_name))
    conn.commit()
    conn.close()

def import_data_from_csv():
    with open('student_data .csv', 'r') as csvfile:
        reader = csv.reader(csvfile)
        next(reader)
        for row in reader:
            insert_student(row)

# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    print_hi('PyCharm')
    # insert_student()
    # remove_student('students', 11)
    #remove_student_by_name('students', 'John', 'Doe')
    import_data_from_csv()






