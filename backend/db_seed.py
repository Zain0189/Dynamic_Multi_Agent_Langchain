import sqlite3
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

DB_PATH = "company.db"


def init_and_seed_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # ----------------------------------------------------
    # 1. CREATE TABLES
    # ----------------------------------------------------
    cursor.executescript("""
    DROP TABLE IF EXISTS attendance;
    DROP TABLE IF EXISTS employee_projects;
    DROP TABLE IF EXISTS jobs;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;

    CREATE TABLE departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        floor INTEGER
    );

    CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        department_id INTEGER NOT NULL,
        designation TEXT NOT NULL,
        date_of_joining DATE NOT NULL,
        salary INTEGER,
        FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        client TEXT,
        status TEXT NOT NULL CHECK(status IN ('Planning', 'Active', 'On Hold', 'Completed')),
        start_date DATE NOT NULL,
        deadline DATE,
        budget INTEGER
    );

    CREATE TABLE employee_projects (
        employee_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        role_in_project TEXT NOT NULL,
        PRIMARY KEY (employee_id, project_id),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'On Leave', 'Remote')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        UNIQUE(employee_id, date)
    );

    CREATE TABLE jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        department_id INTEGER NOT NULL,
        experience_required TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Open', 'Closed')),
        posted_date DATE NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id)
    );
    """)

    # ----------------------------------------------------
    # 2. INSERT DEPARTMENTS
    # ----------------------------------------------------
    departments = [
        ("Engineering & AI", 3),
        ("Human Resources", 1),
        ("Healthcare & Welfare", 1),
        ("Product & Design", 2),
        ("Finance & Legal", 4),
        ("Marketing & Operations", 2),
    ]
    cursor.executemany(
        "INSERT INTO departments (name, floor) VALUES (?, ?);", departments)

    # ----------------------------------------------------
    # 3. INSERT EMPLOYEES (120+ Employees)
    # ----------------------------------------------------
    # Include the specific test query name "Ali Hassan"
    cursor.execute("""
        INSERT INTO employees (name, email, department_id, designation, date_of_joining, salary)
        VALUES ('Ali Hassan', 'ali.hassan@company.com', 1, 'Senior AI Engineer', '2023-01-15', 95000);
    """)

    designations_by_dept = {
        1: ["AI Engineer", "Backend Developer", "Frontend Developer", "MLOps Engineer", "DevOps Engineer", "Full Stack Developer"],
        2: ["HR Executive", "Talent Acquisition Specialist", "HR Manager", "Payroll Lead"],
        3: ["Healthcare Coordinator", "Medical Claims Officer", "Wellness Lead"],
        4: ["UI/UX Designer", "Product Manager", "Scrum Master"],
        5: ["Financial Analyst", "Accountant", "Legal Counsel"],
        6: ["Marketing Strategist", "Operations Manager", "Content Specialist"]
    }

    employees_data = []
    for _ in range(120):
        dept_id = random.randint(1, len(departments))
        name = fake.name()
        email = fake.unique.email()
        designation = random.choice(designations_by_dept[dept_id])
        joining = fake.date_between(start_date='-4y', end_date='today')
        salary = random.randint(45000, 160000)
        employees_data.append(
            (name, email, dept_id, designation, joining, salary))

    cursor.executemany("""
        INSERT INTO employees (name, email, department_id, designation, date_of_joining, salary)
        VALUES (?, ?, ?, ?, ?, ?);
    """, employees_data)

    cursor.execute("SELECT id FROM employees;")
    all_employee_ids = [row[0] for row in cursor.fetchall()]

    # ----------------------------------------------------
    # 4. INSERT PROJECTS (25 Projects)
    # ----------------------------------------------------
    # Include named projects like "Project ABC" and "Smart Pulse"
    priority_projects = [
        ("Project ABC", "OmniCare Inc.", "Active",
         "2024-01-10", "2025-06-30", 250000),
        ("Dynamic AI Portal", "Enterprise Core",
         "Active", "2024-03-01", "2024-12-15", 180000),
        ("Healthcare Claims Auto-Processor", "MetLife Group",
         "Active", "2023-09-01", "2024-10-31", 320000),
        ("HR Central System", "Internal", "Completed",
         "2022-01-01", "2023-01-01", 120000),
        ("Logistics Track Engine", "Global Freight",
         "On Hold", "2023-11-01", "2025-01-15", 90000),
    ]
    cursor.executemany("""
        INSERT INTO projects (name, client, status, start_date, deadline, budget)
        VALUES (?, ?, ?, ?, ?, ?);
    """, priority_projects)

    for i in range(20):
        p_name = f"Project {fake.unique.word().capitalize()}-{random.randint(100, 999)}"
        client = fake.company()
        status = random.choice(
            ['Planning', 'Active', 'Active', 'Completed', 'On Hold'])
        s_date = fake.date_between(start_date='-2y', end_date='-1m')
        deadline = s_date + timedelta(days=random.randint(90, 400))
        budget = random.randint(50000, 500000)
        cursor.execute("""
            INSERT INTO projects (name, client, status, start_date, deadline, budget)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (p_name, client, status, s_date, deadline, budget))

    cursor.execute("SELECT id FROM projects;")
    all_project_ids = [row[0] for row in cursor.fetchall()]

    # ----------------------------------------------------
    # 5. ALLOCATE EMPLOYEES TO PROJECTS
    # ----------------------------------------------------
    # Assign Ali Hassan (ID 1) explicitly to Project ABC (ID 1)
    cursor.execute("""
        INSERT INTO employee_projects (employee_id, project_id, role_in_project)
        VALUES (1, 1, 'Lead AI Architect');
    """)

    allocations = set()
    allocations.add((1, 1))

    project_roles = ["Tech Lead", "Core Developer", "QA Engineer",
                     "Product Owner", "Data Engineer", "Researcher"]

    for emp_id in all_employee_ids:
        # Each employee belongs to 1 to 3 projects
        assigned_projects = random.sample(
            all_project_ids, random.randint(1, 3))
        for prj_id in assigned_projects:
            if (emp_id, prj_id) not in allocations:
                allocations.add((emp_id, prj_id))
                cursor.execute("""
                    INSERT INTO employee_projects (employee_id, project_id, role_in_project)
                    VALUES (?, ?, ?);
                """, (emp_id, prj_id, random.choice(project_roles)))

    # ----------------------------------------------------
    # 6. INSERT ATTENDANCE (Last 14 days for all employees)
    # ----------------------------------------------------
    attendance_records = []
    today = datetime.now().date()

    for day_offset in range(14):
        current_day = today - timedelta(days=day_offset)
        # Skip weekends
        if current_day.weekday() >= 5:
            continue

        for emp_id in all_employee_ids:
            # High probability of being present or remote
            status = random.choices(
                ['Present', 'Remote', 'On Leave', 'Absent'],
                weights=[65, 25, 7, 3]
            )[0]
            attendance_records.append((emp_id, current_day, status))

    cursor.executemany("""
        INSERT INTO attendance (employee_id, date, status)
        VALUES (?, ?, ?);
    """, attendance_records)

    # ----------------------------------------------------
    # 7. INSERT JOB OPENINGS (35 Jobs)
    # ----------------------------------------------------
    job_templates = [
        ("Python Developer", 1, "2-4 years",
         "Experience with FastAPI, Django, and database optimization. Knowledge of LLMs is a plus."),
        ("Senior Python Backend Engineer", 1, "5+ years",
         "Responsible for scalable REST APIs, microservices, and asynchronous architecture."),
        ("AI/ML Engineer (LangChain & RAG)", 1, "3-5 years",
         "Hands-on experience with vector databases (FAISS, Pinecone), agents, and tool calling."),
        ("Frontend React Developer", 4, "2-3 years",
         "Build interactive dashboards using React.js, Tailwind CSS, and REST API integration."),
        ("Junior Data Analyst", 5, "1-2 years",
         "SQL scripting, spreadsheet reporting, and enterprise data hygiene."),
        ("Healthcare Benefits Specialist", 3, "3+ years",
         "Manage insurance policies, assist employees with claims, and oversee benefits programs."),
        ("Technical Recruiter", 2, "2-4 years",
         "Source top engineering talent for AI and full-stack software development roles."),
        ("DevOps / Cloud Specialist", 1, "4+ years",
         "Docker containerization, CI/CD pipelines, and Linux server deployment."),
    ]

    for title, dept, exp, desc in job_templates:
        cursor.execute("""
            INSERT INTO jobs (title, department_id, experience_required, description, status, posted_date)
            VALUES (?, ?, ?, ?, 'Open', ?);
        """, (title, dept, exp, desc, fake.date_between(start_date='-2m', end_date='today')))

    # Add remaining random jobs
    for _ in range(25):
        dept_id = random.randint(1, len(departments))
        title = f"{random.choice(['Junior', 'Mid-level', 'Senior', 'Lead'])} {random.choice(designations_by_dept[dept_id])}"
        exp = f"{random.randint(1, 6)}+ years"
        desc = fake.paragraph(nb_sentences=3)
        status = random.choice(['Open', 'Open', 'Closed'])
        posted = fake.date_between(start_date='-3m', end_date='today')
        cursor.execute("""
            INSERT INTO jobs (title, department_id, experience_required, description, status, posted_date)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (title, dept_id, exp, desc, status, posted))

    conn.commit()
    conn.close()
    print(f"Database successfully generated at: {DB_PATH}")


if __name__ == "__main__":
    init_and_seed_db()
